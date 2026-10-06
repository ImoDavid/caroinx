import "server-only";

import { Schema, type InferSchemaType, type Model } from "mongoose";

import { COUNTRY_CODES } from "@/lib/countries";
import { connection } from "@/lib/db";
import { CHAT_AUTHORS, CHAT_STATUSES, DEFAULT_CHAT_STATUS } from "@/validations/chat";

/**
 * One support conversation between a public visitor and the admin.
 *
 * Its messages live in a SEPARATE collection (`ChatMessage`), unlike
 * `Shipment.statusHistory` which embeds its array. The cursor is why: a poll must
 * be able to return literally nothing, and `{ conversationId, seq: { $gt: n } }`
 * touches one index page and returns zero documents, whereas an embedded array
 * forces every poll to fetch this document just to discover whether anything
 * changed — and `$push` rewrites the document once the array outgrows its
 * allocation, which is the worst possible access pattern under a 3s poll. The
 * inbox list also has to sort by activity without dragging message bodies over
 * the wire. (The 16 MB document cap is NOT a reason: 200 × 2000 chars is 400 KB.)
 *
 * The price is that deletion is two operations with no transaction, so the
 * ordering in `deleteConversation` is load-bearing: messages FIRST, then this.
 *
 * Indexes are declared here but NOT created implicitly — `lib/db.ts` sets
 * `autoIndex: false` in production. Run `npm run db:indexes` after changing any
 * index (rule 16).
 */

/**
 * The consignment a visitor named, denormalised at create time.
 *
 * Both fields are required inside, like `photoSchema`: a link with no tracking
 * code is worse than no link. The subdocument is absent when the visitor gave no
 * code or gave one that did not resolve — the raw attempt is kept separately.
 */
const linkedShipmentSchema = new Schema(
  {
    id: { type: Schema.Types.ObjectId, required: true },
    trackingCode: { type: String, required: true, uppercase: true, trim: true },
  },
  { _id: false },
);

/**
 * Where the conversation started, snapshotted from the `x-vercel-*` request
 * headers by the Route Handler that creates it. Never refreshed:
 * where someone began is a fact, a field that silently changes mid-thread is not.
 *
 * Every field is optional because NONE of those headers exist under `next dev`,
 * so the admin card must render "Not recorded" rather than guessing.
 *
 * There is deliberately no `ip` field. It is the one value that identifies a
 * person beyond what they typed, and no support answer needs it — this
 * application documents its disclosures (gap 15) rather than accumulating them.
 */
const visitorMetaSchema = new Schema(
  {
    country: { type: String, enum: COUNTRY_CODES, uppercase: true, trim: true },
    region: { type: String, trim: true },
    city: { type: String, trim: true },
    timezone: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    referer: { type: String, trim: true },
  },
  { _id: false },
);

const chatConversationSchema = new Schema(
  {
    /**
     * The capability. Whoever holds this cookie may read and write exactly this
     * conversation, so it is unique-indexed, 256 bits of `randomBytes`, and
     * appears in no DTO at all — not even the admin's, because an admin page's
     * props land in the RSC payload the browser can read (rule 46).
     *
     * Its unique index is declared BELOW with an explicit name, not here as
     * field-level `unique: true` — deliberately unlike `Shipment.trackingCode`.
     * Field-level `unique` makes Mongoose's `autoIndex` create `visitorToken_1`,
     * which then collides with the same keys under a different name when
     * `npm run db:indexes` runs, and the script reports a code-85 conflict an
     * operator has to resolve by hand. Declaring it once, named, means autoIndex
     * and the script create exactly the same index.
     */
    visitorToken: { type: String, required: true, trim: true },
    /**
     * A longer-lived browser id. Its ONLY job is the per-visitor conversation
     * cap, and it authorizes nothing. Indexed because that cap counts on it.
     */
    visitorId: { type: String, required: true, trim: true },
    visitorName: { type: String, required: true, trim: true },
    /** Self-asserted and never verified, so it must never authenticate anyone. */
    visitorEmail: { type: String, trim: true, lowercase: true },
    shipment: { type: linkedShipmentSchema },
    /**
     * What the visitor typed when it did NOT resolve to a shipment. Kept rather
     * than discarded (rule 41) so the admin can see what they meant — a
     * transposed character is the most likely reason they are asking for help.
     */
    trackingCodeAttempted: { type: String, trim: true },
    meta: { type: visitorMetaSchema },
    status: {
      type: String,
      enum: CHAT_STATUSES,
      required: true,
      default: DEFAULT_CHAT_STATUS,
    },
    /**
     * The cursor allocator. Every append does `$inc: { lastSeq: 1 }` in the same
     * atomic `findOneAndUpdate` that moves `lastMessageAt`, the preview and the
     * unread counters — so the cursor costs nothing extra, and is gap-free and
     * totally ordered within the conversation (rule 44).
     */
    lastSeq: { type: Number, required: true, default: 0, min: 0 },
    /** Counters, not derived values: every cap is enforced in an update FILTER. */
    messageCount: { type: Number, required: true, default: 0, min: 0 },
    /** Gates the "no image until one text message has been sent" rule. */
    visitorMessageCount: { type: Number, required: true, default: 0, min: 0 },
    imageCount: { type: Number, required: true, default: 0, min: 0 },
    /**
     * Drives the topbar bell. Zeroed by a reply or by opening the thread.
     *
     * Deliberately NOT indexed. The bell's `countDocuments({ unreadForAdmin:
     * { $gt: 0 } })` is a collection scan, which is correct at this application's
     * volume — and a plain index on a field that is 0 on almost every document
     * would barely help, while the partial index that would help needs a
     * `partialFilterExpression` that `scripts/sync-indexes.ts` cannot express.
     * Revisit only if the count actually gets slow (cf. gap 13).
     */
    unreadForAdmin: { type: Number, required: true, default: 0, min: 0 },
    /** Drives the launcher's dot on the public site. */
    unreadForVisitor: { type: Number, required: true, default: 0, min: 0 },
    /**
     * The inbox sort key. Set at create, BEFORE any message exists, so a
     * conversation someone opened and abandoned still sorts into the list rather
     * than falling off the end of it.
     */
    lastMessageAt: { type: Date, required: true, default: () => new Date() },
    lastMessageFrom: { type: String, enum: CHAT_AUTHORS },
    /** Denormalised so the list query never reads a message body. */
    lastMessagePreview: { type: String, trim: true },
    /** Presence. Written at most once per throttle window, never per poll. */
    visitorLastSeenAt: { type: Date },
    /**
     * Per-conversation rather than global, because there is exactly one admin and
     * nowhere to put per-admin state: a single-document collection would be
     * architecture for a hypothetical, and extending better-auth's `user`
     * document is what rule 17 warns about. The consequence is that there is no
     * "an admin is online" signal before a conversation exists, which is why the
     * pre-chat form promises a response time instead of showing a green dot.
     */
    adminLastSeenAt: { type: Date },
    closedAt: { type: Date },
    /** The admin user id. Never mapped into any DTO. */
    closedBy: { type: String },
  },
  {
    timestamps: true,
    /**
     * Pinned explicitly rather than left to Mongoose's pluraliser.
     * `Shipment` → `shipments` is obvious; `ChatConversation` →
     * `chatconversations` (smashed, not snake_cased) is not, and
     * `scripts/sync-indexes.ts` hard-codes the string. Its parity test asserts a
     * COUNT, so a wrong name there would pass CI and silently index nothing.
     */
    collection: "chatconversations",
  },
);

// The capability's uniqueness guarantee. Named here rather than declared as
// field-level `unique: true` so autoIndex and `npm run db:indexes` agree — see
// the field's own comment.
chatConversationSchema.index(
  { visitorToken: 1 },
  { name: "chat_conversation_visitorToken_uidx", unique: true },
);

// Supports the inbox's default view (most recent activity first) and its status
// filter — the same pair, for the same reason, as the shipment list's two.
chatConversationSchema.index(
  { lastMessageAt: -1 },
  { name: "chat_conversation_lastMessageAt_idx" },
);
chatConversationSchema.index(
  { status: 1, lastMessageAt: -1 },
  { name: "chat_conversation_status_lastMessageAt_idx" },
);
// Serves the per-visitor conversation cap, which counts on visitorId.
chatConversationSchema.index(
  { visitorId: 1, createdAt: -1 },
  { name: "chat_conversation_visitorId_createdAt_idx" },
);

export type ChatConversationDocument = InferSchemaType<typeof chatConversationSchema>;

/**
 * Registered on the cached connection rather than the global mongoose instance,
 * and reused if already compiled — `next dev` re-executes this module on hot
 * reload, and re-registering the same name would throw OverwriteModelError.
 *
 * Remember rule 26: a schema change needs a `next dev` restart, or strict mode
 * silently strips the new field on every write.
 */
export const ChatConversation: Model<ChatConversationDocument> =
  (connection.models.ChatConversation as Model<ChatConversationDocument> | undefined) ??
  connection.model<ChatConversationDocument>("ChatConversation", chatConversationSchema);
