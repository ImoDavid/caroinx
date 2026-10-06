import { randomBytes } from "node:crypto";

// Mongoose 9 renamed FilterQuery to QueryFilter.
import { isValidObjectId, type QueryFilter, type Types } from "mongoose";

import { isPresent } from "@/lib/chat-poll-schedule";
import { isCountryCode } from "@/lib/countries";
import { connectToDatabase } from "@/lib/db";
import { ChatConversation, type ChatConversationDocument } from "@/models/ChatConversation";
import { ChatMessage, type ChatMessageDocument } from "@/models/ChatMessage";
import { getShipmentLinkByTrackingCode } from "@/services/shipment.service";
import type {
  ChatImage,
  ChatImageRecord,
  ChatMessage as ChatMessageDto,
  ConversationDetail,
  ConversationPage,
  ConversationSummary,
  VisitorMeta,
} from "@/types/chat";
import type { VisitorConversation, VisitorMessage, VisitorPoll } from "@/types/chat-visitor";
import {
  CHAT_INBOX_PAGE_SIZE,
  CHAT_POLL_PAGE_SIZE,
  CHAT_PRESENCE_THROTTLE_MS,
  CHAT_PRESENCE_WINDOW_MS,
  CONVERSATIONS_PER_VISITOR_MAX,
  IMAGES_PER_CONVERSATION_MAX,
  MESSAGES_PER_CONVERSATION_MAX,
  PREVIEW_MAX_CHARS,
  VISITOR_TOKEN_PATTERN,
  chatSendSchema,
  chatStartSchema,
  type ChatListQuery,
  type ChatStatus,
} from "@/validations/chat";

/**
 * Support-chat business logic.
 *
 * Same contract as `shipment.service.ts`: no `next/*` (lint-enforced), cheap
 * input guards BEFORE `connectToDatabase()`, `null` or a discriminant string for
 * not-found rather than a throw, and private mappers that list every field
 * explicitly. It never sees a `Request`, a `File` or a cookie — the Route
 * Handler resolves those and passes plain data in.
 */

// Re-exported so server callers can keep importing the shapes from the service
// they got them from; client code must import from "@/types/chat".
export type {
  ChatImage,
  ChatImageRecord,
  ChatMessage,
  ConversationDetail,
  ConversationPage,
  ConversationSummary,
  VisitorMeta,
} from "@/types/chat";
export type { VisitorConversation, VisitorMessage, VisitorPoll } from "@/types/chat-visitor";

/* -------------------------------------------------------------------------- */
/* Credentials                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 256 bits, base64url — 43 URL-safe characters.
 *
 * Deliberately NOT `randomInt` over `TRACKING_CODE_ALPHABET` (rule 23). That
 * alphabet exists so a human can read a code aloud off a printed label; this
 * value is never shown to anyone, lives only in an httpOnly cookie, and
 * AUTHORIZES A READ — so it must be unguessable rather than legible. 32^8 (~2^40)
 * is a fine namespace for a tracking code and far too small for a bearer token.
 *
 * No retry loop, unlike `createShipment`: at 2^256 a collision is not a thing
 * that happens, and the unique index turns the impossible case into a failed
 * insert rather than two visitors silently sharing a thread. Lookup is an
 * indexed equality hit rather than a comparison, so there is no timing oracle.
 */
export function generateVisitorToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 128 bits is ample: this identifies a browser for a counter and authorizes nothing. */
export function generateVisitorId(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Rejects a malformed token for the cost of a regex, before any database round
 * trip — the same defence `getShipmentByTrackingCode` relies on, and the only
 * read-side defence these unauthenticated endpoints have (gap 23).
 */
function validToken(token: string): boolean {
  return VISITOR_TOKEN_PATTERN.test(token);
}

/* -------------------------------------------------------------------------- */
/* Mapping — never return raw documents (CLAUDE.md public/private boundary)     */
/* -------------------------------------------------------------------------- */

/**
 * `_id` is typed as a real `ObjectId` rather than `unknown` as in
 * `shipment.service.ts`. That service only ever stringifies it; this one feeds a
 * conversation's `_id` straight back into the message query, and `unknown` will
 * not cast into a query filter.
 */
type ConversationLean = ChatConversationDocument & { _id: Types.ObjectId };
type MessageLean = ChatMessageDocument & { _id: Types.ObjectId };

/**
 * Baked into the mapped URL rather than stored transformed: the raw `secure_url`
 * is the durable record, and a transformation we change later must not require a
 * data migration.
 *
 * `c_limit` only ever shrinks, so a small image is never upscaled; `q_auto` and
 * `f_auto` let Cloudinary pick the format the requesting browser prefers.
 */
const CHAT_IMAGE_TRANSFORM = "c_limit,w_960,q_auto,f_auto";

const UPLOAD_MARKER = "/image/upload/";

/**
 * String surgery on a third party's URL shape, so it falls back to the raw URL
 * when the marker is absent rather than producing something broken.
 */
function deliveryUrl(url: string): string {
  return url.includes(UPLOAD_MARKER)
    ? url.replace(UPLOAD_MARKER, `${UPLOAD_MARKER}${CHAT_IMAGE_TRANSFORM}/`)
    : url;
}

/**
 * Guarded rather than mapped blindly, exactly like `toPhoto`: a half-written
 * subdocument must not reach a renderer as an image with an empty src. Shared by
 * the admin and visitor mappers so the two cannot drift.
 *
 * `publicId` is deliberately NOT carried through. Nothing in either UI needs it
 * (both render a plain `<img>`), and it is a path inside our Cloudinary account.
 */
function toChatImage(image: MessageLean["image"]): ChatImage | undefined {
  return image?.url && image.publicId
    ? { url: deliveryUrl(image.url), width: image.width, height: image.height }
    : undefined;
}

function toChatMessage(doc: MessageLean): ChatMessageDto {
  return {
    id: String(doc._id),
    seq: doc.seq,
    author: doc.author,
    body: doc.body ?? undefined,
    image: toChatImage(doc.image),
    sentAt: doc.sentAt.toISOString(),
  };
}

/**
 * The public shape. Fields listed explicitly, never spread — a spread would
 * publish `_id`, `authorId` (an admin user id) and `image.publicId` on every
 * poll, and would silently publish whatever field is added to the schema next.
 */
function toVisitorMessage(doc: MessageLean): VisitorMessage {
  return {
    seq: doc.seq,
    author: doc.author,
    body: doc.body ?? undefined,
    image: toChatImage(doc.image),
    sentAt: doc.sentAt.toISOString(),
  };
}

/**
 * The public conversation shape, serialised on every poll.
 *
 * The single most important mapper in this file: a spread here would publish
 * `visitorToken`, which is a LIVE CREDENTIAL, to the browser every few seconds.
 * Only the code the visitor typed themselves comes back, and only when it
 * resolved; `agentPresent` is derived so the raw presence timestamp never
 * crosses.
 */
function toVisitorConversation(doc: ConversationLean, now: number): VisitorConversation {
  return {
    name: doc.visitorName,
    status: doc.status,
    trackingCode: doc.shipment?.trackingCode ?? undefined,
    startedAt: doc.createdAt.toISOString(),
    lastSeq: doc.lastSeq,
    unread: doc.unreadForVisitor,
    agentPresent: isPresent(doc.adminLastSeenAt ?? undefined, CHAT_PRESENCE_WINDOW_MS, now),
  };
}

function toSummary(doc: ConversationLean): ConversationSummary {
  return {
    id: String(doc._id),
    visitorName: doc.visitorName,
    status: doc.status,
    trackingCode: doc.shipment?.trackingCode ?? undefined,
    // Checked, not cast — `meta` may predate a country ever being recorded, and
    // none of the x-vercel-* headers exist under `next dev`.
    countryCode: isCountryCode(doc.meta?.country) ? doc.meta.country : undefined,
    lastMessageAt: doc.lastMessageAt.toISOString(),
    lastMessageFrom: doc.lastMessageFrom ?? undefined,
    lastMessagePreview: doc.lastMessagePreview ?? undefined,
    unread: doc.unreadForAdmin,
    messageCount: doc.messageCount,
  };
}

function toDetail(doc: ConversationLean): ConversationDetail {
  return {
    ...toSummary(doc),
    visitorEmail: doc.visitorEmail ?? undefined,
    shipmentId: doc.shipment ? String(doc.shipment.id) : undefined,
    trackingCodeAttempted: doc.trackingCodeAttempted ?? undefined,
    meta: doc.meta
      ? {
          country: isCountryCode(doc.meta.country) ? doc.meta.country : undefined,
          region: doc.meta.region ?? undefined,
          city: doc.meta.city ?? undefined,
          timezone: doc.meta.timezone ?? undefined,
          userAgent: doc.meta.userAgent ?? undefined,
          referer: doc.meta.referer ?? undefined,
        }
      : undefined,
    startedAt: doc.createdAt.toISOString(),
    lastSeq: doc.lastSeq,
    visitorLastSeenAt: doc.visitorLastSeenAt?.toISOString(),
    closedAt: doc.closedAt?.toISOString(),
  };
}

/**
 * Whitespace is collapsed before truncating, so a message that opens with a
 * blank line does not render as a half-empty list row.
 */
function previewOf(body: string | undefined, image: ChatImageRecord | undefined): string {
  const text = body?.replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, PREVIEW_MAX_CHARS);
  return image ? "Image attachment" : "";
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

export type StartResult = { token: string; poll: VisitorPoll } | "invalid" | "too-many";

/**
 * Opens a conversation from the pre-chat form.
 *
 * `visitorId` and `meta` are arguments rather than fields on `input` for the same
 * reason `createShipment` takes `photo` separately: they are resolved at the
 * request boundary, and this service never sees a `Request`.
 *
 * The conversation is created with NO messages — the visitor types their first
 * one into the composer afterwards. `lastMessageAt` defaults to now so an
 * abandoned conversation still sorts into the inbox rather than off the end.
 */
export async function startConversation(
  input: unknown,
  visitorId: string,
  meta?: VisitorMeta,
): Promise<StartResult> {
  const parsed = chatStartSchema.safeParse(input);
  if (!parsed.success) return "invalid";

  await connectToDatabase();

  // A read-then-write, unlike every other cap in this file — and unavoidable:
  // Mongo cannot cap a document COUNT in an update filter without a separate
  // counter document, which gap 14's reasoning rejects. Two tabs racing can
  // therefore land one conversation over the limit. That is acceptable because
  // the cap is advisory anyway: it is counted off a cookie the visitor can clear
  // (gap 24), and it exists to stop an accidental loop, not an attacker.
  const existing = await ChatConversation.countDocuments({ visitorId });
  if (existing >= CONVERSATIONS_PER_VISITOR_MAX) return "too-many";

  // An unknown or malformed code does NOT fail the form (rule 41): it is kept
  // verbatim so the admin can see what the visitor meant.
  const link = parsed.data.trackingCode
    ? await getShipmentLinkByTrackingCode(parsed.data.trackingCode)
    : null;

  const token = generateVisitorToken();

  const created = await ChatConversation.create({
    visitorToken: token,
    visitorId,
    visitorName: parsed.data.name,
    // Mongoose drops an undefined path entirely, so an absent field writes nothing.
    visitorEmail: parsed.data.email,
    shipment: link ? { id: link.id, trackingCode: link.trackingCode } : undefined,
    trackingCodeAttempted: link ? undefined : parsed.data.trackingCode,
    meta,
  });

  return {
    token,
    poll: {
      conversation: toVisitorConversation(created.toObject(), Date.now()),
      messages: [],
      cursor: 0,
      hasMore: false,
    },
  };
}

export type AppendRefusal = "unknown" | "closed" | "message-cap" | "image-cap" | "text-first";

/**
 * Works out WHY an atomic append matched nothing.
 *
 * Only the failure path pays for this second read, so the happy path stays a
 * single write. The filter returning null is genuinely ambiguous — unknown
 * token, closed thread, or any of three caps — and a visitor who is told
 * "something went wrong" when the real answer is "send a message first" will
 * just try again.
 */
async function explainRefusal(token: string, forImage: boolean): Promise<AppendRefusal> {
  const doc = await ChatConversation.findOne(
    { visitorToken: token },
    { status: 1, messageCount: 1, imageCount: 1, visitorMessageCount: 1 },
  ).lean<Pick<
    ConversationLean,
    "status" | "messageCount" | "imageCount" | "visitorMessageCount"
  > | null>();

  if (!doc) return "unknown";
  if (doc.status !== "open") return "closed";
  if (doc.messageCount >= MESSAGES_PER_CONVERSATION_MAX) return "message-cap";
  if (forImage && doc.visitorMessageCount < 1) return "text-first";
  if (forImage && doc.imageCount >= IMAGES_PER_CONVERSATION_MAX) return "image-cap";
  return "unknown";
}

/**
 * Takes one image slot BEFORE the upload runs.
 *
 * Without this, a visitor already at the image cap still gets their file pushed
 * to Cloudinary before the message insert refuses it — so the cap would protect
 * the database and not the upload quota, which is the expensive one.
 *
 * Not transactional with `appendVisitorMessage`, so a failed upload costs one
 * slot. That is the deliberate fail-closed choice; the caller logs it.
 */
export async function reserveVisitorImageSlot(token: string): Promise<"ok" | AppendRefusal> {
  if (!validToken(token)) return "unknown";
  await connectToDatabase();

  const reserved = await ChatConversation.findOneAndUpdate(
    {
      visitorToken: token,
      status: "open",
      messageCount: { $lt: MESSAGES_PER_CONVERSATION_MAX },
      imageCount: { $lt: IMAGES_PER_CONVERSATION_MAX },
      // No image until the visitor has actually said something. Cheap friction
      // that stops a drive-by from using the widget as free image hosting.
      visitorMessageCount: { $gte: 1 },
    },
    { $inc: { imageCount: 1 } },
    { projection: { _id: 1 } },
  ).lean<{ _id: unknown } | null>();

  return reserved ? "ok" : await explainRefusal(token, true);
}

export type AppendResult = { message: VisitorMessage; cursor: number } | AppendRefusal | "invalid";

/**
 * Appends a visitor message, allocating its cursor in the same atomic write.
 *
 * Every cap lives in the FILTER rather than a read-then-write (rule 44): two
 * browser tabs would race straight past a read-then-write, and `null` returning
 * from the update IS the cap.
 */
export async function appendVisitorMessage(
  token: string,
  input: unknown,
  image?: ChatImageRecord,
): Promise<AppendResult> {
  if (!validToken(token)) return "unknown";

  const parsed = chatSendSchema.safeParse(input);
  if (!parsed.success) return "invalid";
  // Exactly one of the two is required, and this is the only layer that sees
  // both — the schema never receives the attachment.
  if (!parsed.data.body && !image) return "invalid";

  await connectToDatabase();
  const now = new Date();

  const conversation = await ChatConversation.findOneAndUpdate(
    {
      visitorToken: token,
      status: "open",
      messageCount: { $lt: MESSAGES_PER_CONVERSATION_MAX },
      // `imageCount` is NOT re-checked: the slot was already reserved, so it may
      // legitimately equal the cap by now. `visitorMessageCount` IS re-checked,
      // because reserve-then-append is not atomic.
      ...(image ? { visitorMessageCount: { $gte: 1 } } : {}),
    },
    {
      $inc: {
        lastSeq: 1,
        messageCount: 1,
        visitorMessageCount: 1,
        unreadForAdmin: 1,
      },
      $set: {
        lastMessageAt: now,
        lastMessageFrom: "visitor",
        lastMessagePreview: previewOf(parsed.data.body, image),
        visitorLastSeenAt: now,
      },
    },
    { returnDocument: "after", projection: { lastSeq: 1 } },
  ).lean<{ _id: Types.ObjectId; lastSeq: number } | null>();

  if (!conversation) return await explainRefusal(token, Boolean(image));

  const created = await ChatMessage.create({
    conversationId: conversation._id,
    seq: conversation.lastSeq,
    author: "visitor",
    body: parsed.data.body,
    image,
    sentAt: now,
  });

  return { message: toVisitorMessage(created.toObject()), cursor: conversation.lastSeq };
}

/**
 * Appends an admin reply.
 *
 * No caps: the admin is trusted, and the counters are there to bound what an
 * anonymous visitor can store. Note the visitor's `messageCount` cap counts
 * admin messages too, so a 200-message thread locks the visitor out — fine for
 * support, and better than two counters to keep in step.
 *
 * Replying is also the primary mark-read path: `unreadForAdmin` is zeroed in the
 * SAME write, so the common case costs no extra operation.
 *
 * A closed conversation still accepts a reply — the admin gets the last word —
 * but is not reopened. Reopening is a separate, deliberate action.
 */
export async function appendAdminMessage(
  id: string,
  input: unknown,
  actorId: string,
  image?: ChatImageRecord,
): Promise<ChatMessageDto | null> {
  if (!isValidObjectId(id)) return null;

  const parsed = chatSendSchema.safeParse(input);
  if (!parsed.success) return null;
  if (!parsed.data.body && !image) return null;

  await connectToDatabase();
  const now = new Date();

  const conversation = await ChatConversation.findByIdAndUpdate(
    id,
    {
      $inc: { lastSeq: 1, messageCount: 1, unreadForVisitor: 1 },
      $set: {
        lastMessageAt: now,
        lastMessageFrom: "admin",
        lastMessagePreview: previewOf(parsed.data.body, image),
        unreadForAdmin: 0,
        adminLastSeenAt: now,
      },
    },
    { returnDocument: "after", projection: { lastSeq: 1 } },
  ).lean<{ _id: Types.ObjectId; lastSeq: number } | null>();

  if (!conversation) return null;

  const created = await ChatMessage.create({
    conversationId: conversation._id,
    seq: conversation.lastSeq,
    author: "admin",
    authorId: actorId,
    body: parsed.data.body,
    image,
    sentAt: now,
  });

  return toChatMessage(created.toObject());
}

/**
 * Presence, written at most once per throttle window however often the poll runs.
 *
 * The throttle is the update's own FILTER, not a check in the caller: a naive
 * version would be one write per poll, which at the active rate is 20 writes a
 * minute per visitor to record something nobody reads that often.
 */
export async function touchVisitorPresence(token: string): Promise<void> {
  if (!validToken(token)) return;
  await connectToDatabase();

  const now = new Date();
  const stale = new Date(now.getTime() - CHAT_PRESENCE_THROTTLE_MS);

  await ChatConversation.updateOne(
    {
      visitorToken: token,
      $or: [{ visitorLastSeenAt: { $exists: false } }, { visitorLastSeenAt: { $lt: stale } }],
    },
    { $set: { visitorLastSeenAt: now } },
  );
}

/** The admin's side of the same thing. Who is looking is not recorded: there is one admin. */
export async function touchAdminPresence(id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectToDatabase();

  const now = new Date();
  const stale = new Date(now.getTime() - CHAT_PRESENCE_THROTTLE_MS);

  await ChatConversation.updateOne(
    {
      _id: id,
      $or: [{ adminLastSeenAt: { $exists: false } }, { adminLastSeenAt: { $lt: stale } }],
    },
    { $set: { adminLastSeenAt: now } },
  );
}

/**
 * Clears the admin's unread count.
 *
 * The `$gt: 0` filter makes this a no-op write when there is nothing to clear,
 * which matters because the admin poll calls it on every tick — an
 * unconditional `$set` would be 20 pointless writes a minute.
 */
export async function markConversationRead(id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectToDatabase();

  await ChatConversation.updateOne(
    { _id: id, unreadForAdmin: { $gt: 0 } },
    { $set: { unreadForAdmin: 0 } },
  );
}

/** The visitor's side. Same no-op-when-clear filter, same reason. */
export async function markVisitorRead(token: string): Promise<void> {
  if (!validToken(token)) return;
  await connectToDatabase();

  await ChatConversation.updateOne(
    { visitorToken: token, unreadForVisitor: { $gt: 0 } },
    { $set: { unreadForVisitor: 0 } },
  );
}

export async function closeConversation(id: string, actorId: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectToDatabase();

  const result = await ChatConversation.updateOne(
    { _id: id, status: "open" },
    { $set: { status: "closed", closedAt: new Date(), closedBy: actorId } },
  );

  return result.matchedCount > 0;
}

export async function reopenConversation(id: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectToDatabase();

  const result = await ChatConversation.updateOne(
    { _id: id, status: "closed" },
    // Mongo rejects an empty $unset object, so this key is always needed here —
    // unlike the conditional shape updateShipment uses.
    { $set: { status: "open" }, $unset: { closedAt: "", closedBy: "" } },
  );

  return result.matchedCount > 0;
}

/**
 * Permanent, like a shipment delete (rule 25). There is no archive.
 *
 * MESSAGES FIRST, then the conversation. The two collections give no
 * transaction, so one order has to be chosen and this is the safe one: an orphan
 * message is unreachable (nothing can query it without a conversation id) and a
 * future prune reaps it, whereas a conversation whose messages are gone renders
 * as an empty thread the admin cannot explain.
 *
 * The Cloudinary assets are NOT deleted — see gap 27.
 */
export async function deleteConversation(id: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectToDatabase();

  await ChatMessage.deleteMany({ conversationId: id });
  const result = await ChatConversation.findByIdAndDelete(id).lean<{ _id: unknown } | null>();

  return result !== null;
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One page of messages after a cursor, plus the conversation the widget renders
 * around them.
 *
 * `panelOpen` tells us whether the visitor is actually looking: a closed panel
 * polls too (so it can raise an unread dot), and clearing the dot on that poll
 * would mean it never showed. It is a claim from the client, which is fine —
 * the worst a lying client achieves is clearing its own badge.
 */
export async function pollVisitorMessages(
  token: string,
  after: number,
  panelOpen: boolean,
): Promise<VisitorPoll | null> {
  if (!validToken(token)) return null;
  await connectToDatabase();

  if (panelOpen) await markVisitorRead(token);

  const conversation = await ChatConversation.findOne({
    visitorToken: token,
  }).lean<ConversationLean | null>();
  if (!conversation) return null;

  const { messages, cursor, hasMore } = await pageAfter(conversation._id, after);

  return {
    conversation: toVisitorConversation(conversation, Date.now()),
    messages: messages.map(toVisitorMessage),
    cursor,
    hasMore,
  };
}

/**
 * The shared cursor read.
 *
 * Fetches one more than a page so `hasMore` is known without a second count, and
 * the cursor falls back to what was asked for when nothing came back — so a
 * caught-up poll cannot rewind and re-request an old window.
 */
async function pageAfter(
  conversationId: Types.ObjectId,
  after: number,
): Promise<{ messages: MessageLean[]; cursor: number; hasMore: boolean }> {
  const docs = await ChatMessage.find({ conversationId, seq: { $gt: after } })
    .sort({ seq: 1 })
    .limit(CHAT_POLL_PAGE_SIZE + 1)
    .lean<MessageLean[]>();

  const hasMore = docs.length > CHAT_POLL_PAGE_SIZE;
  const messages = hasMore ? docs.slice(0, CHAT_POLL_PAGE_SIZE) : docs;

  return { messages, cursor: messages.at(-1)?.seq ?? after, hasMore };
}

export async function getConversationByToken(token: string): Promise<VisitorConversation | null> {
  if (!validToken(token)) return null;
  await connectToDatabase();

  const doc = await ChatConversation.findOne({
    visitorToken: token,
  }).lean<ConversationLean | null>();
  return doc ? toVisitorConversation(doc, Date.now()) : null;
}

export async function getConversationForAdmin(id: string): Promise<ConversationDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();

  const doc = await ChatConversation.findById(id).lean<ConversationLean | null>();
  return doc ? toDetail(doc) : null;
}

export type AdminThreadPoll = {
  messages: ChatMessageDto[];
  cursor: number;
  hasMore: boolean;
  status: ChatStatus;
};

/**
 * The admin's thread poll. Marks read and records presence in the same round
 * trip as the message read, so an open thread costs three operations rather than
 * three sequential waits.
 */
export async function pollAdminMessages(
  id: string,
  after: number,
): Promise<AdminThreadPoll | null> {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();

  const conversation = await ChatConversation.findById(id)
    .select({ status: 1 })
    .lean<Pick<ConversationLean, "status"> & { _id: Types.ObjectId }>();
  if (!conversation) return null;

  const [page] = await Promise.all([
    pageAfter(conversation._id, after),
    markConversationRead(id),
    touchAdminPresence(id),
  ]);

  return {
    messages: page.messages.map(toChatMessage),
    cursor: page.cursor,
    hasMore: page.hasMore,
    status: conversation.status,
  };
}

/**
 * Drives the topbar bell.
 *
 * An unindexed count (see the note on `unreadForAdmin` in the model). Correct at
 * this application's volume; revisit only if it actually gets slow.
 */
export async function countUnreadConversations(): Promise<number> {
  await connectToDatabase();
  return await ChatConversation.countDocuments({ unreadForAdmin: { $gt: 0 } });
}

/**
 * User input reaches a RegExp, so metacharacters must be neutralised or a search
 * for "a.*" would become a wildcard scan.
 *
 * A deliberate twin of the helper in `shipment.service.ts`. Both are three lines
 * and neither service should import the other for a string utility — but they
 * are security-relevant, so a fix to one must be applied to the other.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listConversations(query: ChatListQuery): Promise<ConversationPage> {
  await connectToDatabase();

  const filter: QueryFilter<ChatConversationDocument> = {};
  if (query.status) filter.status = query.status;
  if (query.unread) filter.unreadForAdmin = { $gt: 0 };

  if (query.q) {
    const term = new RegExp(escapeRegExp(query.q), "i");
    // The preview is searched rather than message bodies: this is a list query,
    // and joining to chatmessages to search text would need an index this
    // application has no volume to justify.
    filter.$or = [
      { visitorName: term },
      { visitorEmail: term },
      { lastMessagePreview: term },
      { "shipment.trackingCode": term },
    ];
  }

  const page = Math.max(1, query.page);
  const skip = (page - 1) * CHAT_INBOX_PAGE_SIZE;

  const [docs, total] = await Promise.all([
    ChatConversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(CHAT_INBOX_PAGE_SIZE)
      .lean<ConversationLean[]>(),
    ChatConversation.countDocuments(filter),
  ]);

  return {
    items: docs.map(toSummary),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / CHAT_INBOX_PAGE_SIZE)),
    pageSize: CHAT_INBOX_PAGE_SIZE,
  };
}
