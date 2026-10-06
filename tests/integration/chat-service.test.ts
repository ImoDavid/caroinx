import { ObjectId } from "mongodb";
import type mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  appendAdminMessage,
  appendVisitorMessage,
  closeConversation,
  countUnreadConversations,
  deleteConversation,
  generateVisitorId,
  generateVisitorToken,
  getConversationByToken,
  getConversationForAdmin,
  listConversations,
  markVisitorRead,
  pollAdminMessages,
  pollVisitorMessages,
  reopenConversation,
  reserveVisitorImageSlot,
  startConversation,
  touchVisitorPresence,
} from "@/services/chat.service";
import { createShipment } from "@/services/shipment.service";
import {
  CONVERSATIONS_PER_VISITOR_MAX,
  IMAGES_PER_CONVERSATION_MAX,
  MESSAGES_PER_CONVERSATION_MAX,
  PREVIEW_MAX_CHARS,
  chatListQuerySchema,
  type ChatListQuery,
} from "@/validations/chat";

import { openTestConnection } from "../helpers/db.ts";

/**
 * The chat service against real MongoDB.
 *
 * The cursor is what most of this file is about. A `seq` that can repeat or skip
 * loses or duplicates a message silently, and no amount of UI testing would
 * surface it — so the concurrency cases here are the point of the suite, not
 * decoration.
 *
 * Deliberately NOT covered: that the token guard runs before
 * `connectToDatabase()`. Asserting it needs the db module mocked, which would
 * cost this suite its "real Mongo, no mocks" property for a property that is
 * plain in the code. The behaviour (right discriminant for a bad token) IS
 * covered.
 */

let db: mongoose.mongo.Db;
let close: () => Promise<void>;

beforeAll(async () => {
  const opened = await openTestConnection();
  db = opened.db;
  close = opened.close;
});

afterAll(async () => {
  await close();
});

beforeEach(async () => {
  await db.collection("chatconversations").deleteMany({});
  await db.collection("chatmessages").deleteMany({});
  await db.collection("shipments").deleteMany({});
});

const IMAGE = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/sendly/chat/a.png",
  publicId: "sendly/chat/a",
  width: 1200,
  height: 800,
};

const ACTOR = "admin-user-1";

/** Opens a conversation and returns its token, failing loudly on a refusal. */
async function start(overrides: Record<string, unknown> = {}): Promise<string> {
  const result = await startConversation({ name: "Ada Okafor", ...overrides }, generateVisitorId());
  if (typeof result === "string") throw new Error(`startConversation refused: ${result}`);
  return result.token;
}

async function idOf(token: string): Promise<string> {
  const doc = await db.collection("chatconversations").findOne({ visitorToken: token });
  return String(doc?._id);
}

/**
 * Built through the schema rather than hand-written, which is both how the inbox
 * page does it and the only shape that typechecks: `.catch(undefined)` sits
 * outside `.optional()`, so every key of `ChatListQuery` is required-but-possibly
 * -undefined (the trap rule 22 describes, shared with `shipmentListQuerySchema`).
 * Parsing here also means these cases cover the query schema and the service
 * together, the way a request actually arrives.
 */
function listQuery(overrides: Record<string, unknown> = {}): ChatListQuery {
  return chatListQuerySchema.parse({ page: 1, ...overrides });
}

describe("generateVisitorToken", () => {
  it("is long enough to be a bearer credential, unlike a tracking code", () => {
    // Rule 46: 2^256, not the 2^40 a tracking code's alphabet gives.
    expect(generateVisitorToken()).toHaveLength(43);
    expect(generateVisitorToken()).not.toBe(generateVisitorToken());
  });
});

describe("startConversation", () => {
  it("opens a thread with no messages but a sortable timestamp", async () => {
    const token = await start();
    const conversation = await getConversationByToken(token);

    expect(conversation?.name).toBe("Ada Okafor");
    expect(conversation?.status).toBe("open");
    expect(conversation?.lastSeq).toBe(0);
    // Set at create so an abandoned conversation still sorts into the inbox.
    const stored = await db.collection("chatconversations").findOne({ visitorToken: token });
    expect(stored?.lastMessageAt).toBeInstanceOf(Date);
  });

  it("refuses a payload with no name rather than inventing one", async () => {
    expect(await startConversation({ name: "" }, generateVisitorId())).toBe("invalid");
  });

  it("links a conversation to a shipment when the tracking code resolves", async () => {
    const shipment = await createShipment(
      {
        sender: { name: "A", country: "NG", location: "Lagos" },
        receiver: { name: "B", country: "GH", location: "Accra" },
        details: { transportType: "air", weightKg: 10, shipDate: new Date() },
        status: "on_the_way",
      },
      ACTOR,
    );

    const token = await start({ trackingCode: shipment.trackingCode });
    const detail = await getConversationForAdmin(await idOf(token));

    expect(detail?.trackingCode).toBe(shipment.trackingCode);
    expect(detail?.shipmentId).toBe(shipment.id);
    expect(detail?.trackingCodeAttempted).toBeUndefined();
  });

  it("keeps an unresolvable code instead of rejecting the request", async () => {
    // Rule 41. The visitor is asking for help precisely because the code is
    // wrong; failing the form would block the request that was the point.
    const token = await start({ trackingCode: "TGR-ZZZZZZZZ" });
    const detail = await getConversationForAdmin(await idOf(token));

    expect(detail?.trackingCodeAttempted).toBe("TGR-ZZZZZZZZ");
    expect(detail?.trackingCode).toBeUndefined();
    expect(detail?.shipmentId).toBeUndefined();
  });

  it("caps conversations per visitor cookie", async () => {
    const visitorId = generateVisitorId();
    for (let i = 0; i < CONVERSATIONS_PER_VISITOR_MAX; i += 1) {
      expect(await startConversation({ name: "Ada" }, visitorId)).not.toBe("too-many");
    }

    expect(await startConversation({ name: "Ada" }, visitorId)).toBe("too-many");
    // A different browser is unaffected — the cap is per cookie, not global.
    expect(await startConversation({ name: "Ada" }, generateVisitorId())).not.toBe("too-many");
  });

  it("stores a geo snapshot with no ip key, however it is called", async () => {
    const token = await start();
    await db
      .collection("chatconversations")
      .updateOne(
        { visitorToken: token },
        { $set: { meta: { country: "NG", city: "Lagos", timezone: "Africa/Lagos" } } },
      );

    const detail = await getConversationForAdmin(await idOf(token));

    expect(detail?.meta?.country).toBe("NG");
    expect(detail?.meta?.city).toBe("Lagos");
    // The field does not exist on the schema, so it cannot be round-tripped even
    // if a handler tried to pass one.
    expect(detail?.meta).not.toHaveProperty("ip");
  });
});

describe("the cursor", () => {
  it("allocates gap-free, strictly increasing seqs across both authors", async () => {
    const token = await start();
    const id = await idOf(token);

    await appendVisitorMessage(token, { body: "one" });
    await appendAdminMessage(id, { body: "two" }, ACTOR);
    await appendVisitorMessage(token, { body: "three" });

    const poll = await pollVisitorMessages(token, 0, true);

    expect(poll?.messages.map((message) => message.seq)).toEqual([1, 2, 3]);
    expect(poll?.messages.map((message) => message.author)).toEqual([
      "visitor",
      "admin",
      "visitor",
    ]);
    expect(poll?.cursor).toBe(3);
  });

  it("returns an empty array once caught up, without rewinding the cursor", async () => {
    const token = await start();
    await appendVisitorMessage(token, { body: "one" });

    const caughtUp = await pollVisitorMessages(token, 1, true);

    expect(caughtUp?.messages).toEqual([]);
    expect(caughtUp?.hasMore).toBe(false);
    // Must not fall back to 0, or the next poll re-requests the whole thread.
    expect(caughtUp?.cursor).toBe(1);
  });

  it("never skips or duplicates a message under concurrent appends", async () => {
    // The reason the cursor is an $inc-allocated integer rather than an ObjectId
    // or a timestamp (rule 44). Two serverless instances appending in the same
    // millisecond must still produce a total order.
    const token = await start();
    const total = 25;

    await Promise.all(
      Array.from({ length: total }, (_unused, index) =>
        appendVisitorMessage(token, { body: `message ${index}` }),
      ),
    );

    const stored = await db
      .collection("chatmessages")
      .find<{ seq: number }>({})
      .sort({ seq: 1 })
      .toArray();

    expect(stored.map((message) => message.seq)).toEqual(
      Array.from({ length: total }, (_unused, index) => index + 1),
    );
    expect(new Set(stored.map((message) => message.seq)).size).toBe(total);
  });

  it("pages a long thread and says there is more", async () => {
    const token = await start();
    for (let i = 0; i < 60; i += 1) await appendVisitorMessage(token, { body: `m${i}` });

    const first = await pollVisitorMessages(token, 0, true);
    expect(first?.messages).toHaveLength(50);
    expect(first?.hasMore).toBe(true);

    const second = await pollVisitorMessages(token, first!.cursor, true);
    expect(second?.messages).toHaveLength(10);
    expect(second?.hasMore).toBe(false);
  });
});

describe("appendVisitorMessage", () => {
  it("refuses a message that is neither text nor image", async () => {
    const token = await start();
    expect(await appendVisitorMessage(token, { body: "   " })).toBe("invalid");
  });

  it("returns the right discriminant for a token that cannot exist", async () => {
    expect(await appendVisitorMessage("not-a-token", { body: "hi" })).toBe("unknown");
    expect(await appendVisitorMessage(generateVisitorToken(), { body: "hi" })).toBe("unknown");
  });

  it("refuses once the conversation is closed", async () => {
    const token = await start();
    await closeConversation(await idOf(token), ACTOR);

    expect(await appendVisitorMessage(token, { body: "hello?" })).toBe("closed");
  });

  it("enforces the message cap in the update filter, not a read-then-write", async () => {
    const token = await start();
    await db
      .collection("chatconversations")
      .updateOne(
        { visitorToken: token },
        { $set: { messageCount: MESSAGES_PER_CONVERSATION_MAX } },
      );

    expect(await appendVisitorMessage(token, { body: "one more" })).toBe("message-cap");
  });

  it("raises the admin's unread count", async () => {
    const token = await start();
    await appendVisitorMessage(token, { body: "one" });
    await appendVisitorMessage(token, { body: "two" });

    expect(await countUnreadConversations()).toBe(1);
    expect((await getConversationForAdmin(await idOf(token)))?.unread).toBe(2);
  });

  it("collapses whitespace and caps the inbox preview", async () => {
    const token = await start();
    await appendVisitorMessage(token, { body: `\n\n  spread   over\nlines ${"x".repeat(400)}` });

    const [summary] = (await listConversations(listQuery())).items;

    expect(summary?.lastMessagePreview?.startsWith("spread over lines")).toBe(true);
    expect(summary?.lastMessagePreview?.length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
  });

  it("labels an image-only message in the preview", async () => {
    const token = await start();
    await appendVisitorMessage(token, { body: "first" });
    await reserveVisitorImageSlot(token);
    await appendVisitorMessage(token, {}, IMAGE);

    const [summary] = (await listConversations(listQuery())).items;
    expect(summary?.lastMessagePreview).toBe("Image attachment");
  });
});

describe("image slots", () => {
  it("refuses an attachment before any text has been sent", async () => {
    // Cheap friction that stops a drive-by using the widget as image hosting.
    const token = await start();
    expect(await reserveVisitorImageSlot(token)).toBe("text-first");
  });

  it("reserves the slot BEFORE the upload, so a capped visitor cannot burn quota", async () => {
    const token = await start();
    await appendVisitorMessage(token, { body: "first" });

    expect(await reserveVisitorImageSlot(token)).toBe("ok");

    const stored = await db.collection("chatconversations").findOne({ visitorToken: token });
    // Incremented by the reservation, not by the append that follows it.
    expect(stored?.imageCount).toBe(1);
  });

  it("does not double-count when the append follows the reservation", async () => {
    const token = await start();
    await appendVisitorMessage(token, { body: "first" });
    await reserveVisitorImageSlot(token);
    await appendVisitorMessage(token, { body: "see this" }, IMAGE);

    const stored = await db.collection("chatconversations").findOne({ visitorToken: token });
    expect(stored?.imageCount).toBe(1);
  });

  it("caps images per conversation", async () => {
    const token = await start();
    await appendVisitorMessage(token, { body: "first" });
    await db
      .collection("chatconversations")
      .updateOne({ visitorToken: token }, { $set: { imageCount: IMAGES_PER_CONVERSATION_MAX } });

    expect(await reserveVisitorImageSlot(token)).toBe("image-cap");
  });

  it("still accepts the message when the slot was already reserved at the cap", async () => {
    // imageCount may legitimately EQUAL the cap by append time, because the
    // reservation incremented it. Re-checking it there would reject the last
    // allowed image.
    const token = await start();
    await appendVisitorMessage(token, { body: "first" });
    for (let i = 0; i < IMAGES_PER_CONVERSATION_MAX; i += 1) {
      expect(await reserveVisitorImageSlot(token)).toBe("ok");
    }

    const result = await appendVisitorMessage(token, {}, IMAGE);
    expect(typeof result).not.toBe("string");
  });
});

describe("appendAdminMessage", () => {
  it("clears the unread count in the same write as the reply", async () => {
    const token = await start();
    const id = await idOf(token);
    await appendVisitorMessage(token, { body: "where is my parcel" });

    await appendAdminMessage(id, { body: "checking now" }, ACTOR);

    expect(await countUnreadConversations()).toBe(0);
    expect((await getConversationForAdmin(id))?.unread).toBe(0);
  });

  it("raises the visitor's unread count instead", async () => {
    const token = await start();
    await appendAdminMessage(await idOf(token), { body: "hello" }, ACTOR);

    expect((await getConversationByToken(token))?.unread).toBe(1);

    await markVisitorRead(token);
    expect((await getConversationByToken(token))?.unread).toBe(0);
  });

  it("answers null for a malformed id rather than throwing", async () => {
    expect(await appendAdminMessage("not-an-id", { body: "hi" }, ACTOR)).toBeNull();
    expect(await appendAdminMessage(new ObjectId().toString(), { body: "hi" }, ACTOR)).toBeNull();
  });

  it("gets the last word on a closed thread without reopening it", async () => {
    const token = await start();
    const id = await idOf(token);
    await closeConversation(id, ACTOR);

    expect(await appendAdminMessage(id, { body: "for the record" }, ACTOR)).not.toBeNull();
    expect((await getConversationForAdmin(id))?.status).toBe("closed");
  });
});

describe("the public/private boundary", () => {
  it("publishes no credential, no internal id and no admin actor to the visitor", async () => {
    // The mirror of tracking.test.ts's "these fields ARE present", inverted.
    // This shape is serialised to the browser every few seconds and one of the
    // fields it must not carry is a live credential (rule 46).
    const token = await start({ email: "ada@example.com", trackingCode: "TGR-ZZZZZZZZ" });
    const id = await idOf(token);
    await appendVisitorMessage(token, { body: "hello" });
    await reserveVisitorImageSlot(token);
    await appendAdminMessage(id, { body: "hi" }, ACTOR, IMAGE);

    const poll = await pollVisitorMessages(token, 0, true);
    const serialised = JSON.stringify(poll);

    for (const secret of [token, ACTOR, id, "publicId", "visitorToken", "visitorId"]) {
      expect(serialised).not.toContain(secret);
    }
    // Nor the internal handles, by name.
    expect(poll?.conversation).not.toHaveProperty("id");
    expect(poll?.conversation).not.toHaveProperty("adminLastSeenAt");
    expect(poll?.conversation).not.toHaveProperty("trackingCodeAttempted");
    expect(poll?.messages[0]).not.toHaveProperty("id");
    expect(poll?.messages[0]).not.toHaveProperty("authorId");
  });

  it("does not leak the admin user id into the admin DTO either", async () => {
    const token = await start();
    const id = await idOf(token);
    await appendAdminMessage(id, { body: "hi" }, ACTOR);

    const thread = await pollAdminMessages(id, 0);
    expect(JSON.stringify(thread)).not.toContain(ACTOR);
  });

  it("bakes the delivery transform into the image URL and drops the publicId", async () => {
    const token = await start();
    await appendVisitorMessage(token, { body: "first" });
    await reserveVisitorImageSlot(token);
    await appendVisitorMessage(token, {}, IMAGE);

    const poll = await pollVisitorMessages(token, 0, true);
    const image = poll?.messages.at(-1)?.image;

    expect(image?.url).toContain("/image/upload/c_limit,w_960,q_auto,f_auto/");
    expect(image).not.toHaveProperty("publicId");
    // Dimensions describe the ORIGINAL, so they are aspect ratio only.
    expect(image?.width).toBe(1200);
  });

  it("leaves a URL it does not recognise alone rather than mangling it", async () => {
    const token = await start();
    await appendVisitorMessage(token, { body: "first" });
    await reserveVisitorImageSlot(token);
    await appendVisitorMessage(token, {}, { ...IMAGE, url: "https://example.com/plain.png" });

    const poll = await pollVisitorMessages(token, 0, true);
    expect(poll?.messages.at(-1)?.image?.url).toBe("https://example.com/plain.png");
  });
});

describe("presence", () => {
  it("writes at most once per throttle window, however often the poll runs", async () => {
    const token = await start();
    await touchVisitorPresence(token);

    const first = await db.collection("chatconversations").findOne({ visitorToken: token });
    await touchVisitorPresence(token);
    const second = await db.collection("chatconversations").findOne({ visitorToken: token });

    // Unchanged: the second call's filter did not match, so there was no write.
    expect(second?.visitorLastSeenAt).toEqual(first?.visitorLastSeenAt);
  });

  it("reports the agent absent until someone actually opens the thread", async () => {
    const token = await start();
    expect((await getConversationByToken(token))?.agentPresent).toBe(false);

    await pollAdminMessages(await idOf(token), 0);
    expect((await getConversationByToken(token))?.agentPresent).toBe(true);
  });
});

describe("close, reopen and delete", () => {
  it("closes once and refuses a second close", async () => {
    const token = await start();
    const id = await idOf(token);

    expect(await closeConversation(id, ACTOR)).toBe(true);
    expect(await closeConversation(id, ACTOR)).toBe(false);
    expect((await getConversationForAdmin(id))?.closedAt).toBeDefined();
  });

  it("reopens and clears the closure record", async () => {
    const token = await start();
    const id = await idOf(token);
    await closeConversation(id, ACTOR);

    expect(await reopenConversation(id)).toBe(true);

    const detail = await getConversationForAdmin(id);
    expect(detail?.status).toBe("open");
    // $unset, not $set undefined — Mongoose strips undefined from $set.
    expect(detail?.closedAt).toBeUndefined();
    const stored = await db.collection("chatconversations").findOne({ _id: new ObjectId(id) });
    expect(stored).not.toHaveProperty("closedBy");
  });

  it("deletes the messages as well as the conversation", async () => {
    const token = await start();
    const id = await idOf(token);
    await appendVisitorMessage(token, { body: "one" });
    await appendVisitorMessage(token, { body: "two" });

    expect(await deleteConversation(id)).toBe(true);

    expect(await db.collection("chatmessages").countDocuments({})).toBe(0);
    expect(await getConversationForAdmin(id)).toBeNull();
  });

  it("answers false for a malformed id rather than throwing", async () => {
    expect(await deleteConversation("not-an-id")).toBe(false);
    expect(await closeConversation("not-an-id", ACTOR)).toBe(false);
    expect(await reopenConversation("not-an-id")).toBe(false);
  });
});

describe("listConversations", () => {
  it("sorts by most recent activity, not by creation", async () => {
    const first = await start({ name: "First" });
    await start({ name: "Second" });

    // The older conversation gets the newer message, so it must sort first.
    await appendVisitorMessage(first, { body: "late reply" });

    const page = await listConversations(listQuery());
    expect(page.items.map((item) => item.visitorName)).toEqual(["First", "Second"]);
  });

  it("filters by status and by unread", async () => {
    const open = await start({ name: "Open" });
    const closed = await start({ name: "Closed" });
    await appendVisitorMessage(open, { body: "hello" });
    await closeConversation(await idOf(closed), ACTOR);

    expect((await listConversations(listQuery({ status: "closed" }))).items).toHaveLength(1);
    expect((await listConversations(listQuery({ unread: "1" }))).items).toHaveLength(1);
    expect((await listConversations(listQuery({ unread: "1" }))).items[0]?.visitorName).toBe(
      "Open",
    );
  });

  it("searches names, emails, previews and linked codes without regex injection", async () => {
    await start({ name: "Ada Okafor", email: "ada@example.com" });
    await start({ name: "Other Person" });

    expect((await listConversations(listQuery({ q: "okafor" }))).items).toHaveLength(1);
    expect((await listConversations(listQuery({ q: "ada@example" }))).items).toHaveLength(1);
    // A metacharacter must be a literal, not a wildcard scan matching everything.
    expect((await listConversations(listQuery({ q: ".*" }))).items).toHaveLength(0);
  });

  it("reports a page count even when empty", async () => {
    const page = await listConversations(listQuery());
    expect(page).toMatchObject({ total: 0, page: 1, pageCount: 1 });
  });
});
