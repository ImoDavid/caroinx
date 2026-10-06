import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_MIME_TYPES,
  MESSAGE_MAX_CHARS,
  TRACKING_CODE_ATTEMPT_MAX,
  VISITOR_ID_PATTERN,
  VISITOR_NAME_MAX,
  VISITOR_TOKEN_PATTERN,
  chatCursorSchema,
  chatImageSchema,
  chatListQuerySchema,
  chatSendSchema,
  chatStartSchema,
} from "@/validations/chat";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/validations/shipment";

describe("chatStartSchema", () => {
  it("accepts a name on its own, because that is the only thing worth blocking on", () => {
    const parsed = chatStartSchema.parse({ name: "Ada Okafor" });

    expect(parsed.name).toBe("Ada Okafor");
    expect(parsed.email).toBeUndefined();
    expect(parsed.trackingCode).toBeUndefined();
  });

  it("requires a name, so the inbox is not a wall of anonymous threads", () => {
    expect(chatStartSchema.safeParse({ name: "" }).success).toBe(false);
    expect(chatStartSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(chatStartSchema.safeParse({ name: "a".repeat(VISITOR_NAME_MAX + 1) }).success).toBe(
      false,
    );
  });

  it("treats a blank email as absent rather than as an invalid address", () => {
    // Rule 22: `.optional()` outermost. A blank optional field is not an error.
    expect(chatStartSchema.parse({ name: "Ada", email: "" }).email).toBeUndefined();
  });

  it("omits the email KEY only when it was omitted going in", () => {
    // The distinction rule 22's comment draws: `.optional()` outermost makes the
    // key omittABLE, but a key that is present and blank comes back present with
    // an undefined value. Both are safe — Mongoose drops an undefined path on
    // insert, and the service's $set/$unset choice tests truthiness — but a
    // caller spreading the result must not assume the key is gone.
    expect("email" in chatStartSchema.parse({ name: "Ada" })).toBe(false);
    expect("email" in chatStartSchema.parse({ name: "Ada", email: "" })).toBe(true);
  });

  it("still rejects a malformed email once one is actually typed", () => {
    expect(chatStartSchema.safeParse({ name: "Ada", email: "not-an-address" }).success).toBe(false);
  });

  it("lower-cases an email so the admin never sees two spellings of one address", () => {
    expect(chatStartSchema.parse({ name: "Ada", email: " Ada@Example.COM " }).email).toBe(
      "ada@example.com",
    );
  });

  it("ACCEPTS an invalid tracking code instead of failing the form", () => {
    // Rule 54. Failing here would block the support request that was the whole
    // point — the visitor is asking for help precisely because something is
    // wrong with their code. The service decides whether it resolves.
    const parsed = chatStartSchema.parse({ name: "Ada", trackingCode: "not a real code" });

    expect(parsed.trackingCode).toBe("NOTAREALCODE");
  });

  it("normalises a tracking code the way a customer types it", () => {
    expect(
      chatStartSchema.parse({ name: "Ada", trackingCode: " tgr-abc12345 " }).trackingCode,
    ).toBe("TGR-ABC12345");
  });

  it("caps a pasted tracking code rather than storing a wall of text", () => {
    const parsed = chatStartSchema.parse({ name: "Ada", trackingCode: "X".repeat(500) });

    expect(parsed.trackingCode).toHaveLength(TRACKING_CODE_ATTEMPT_MAX);
  });

  it("treats a blank tracking code as absent", () => {
    expect(chatStartSchema.parse({ name: "Ada", trackingCode: "  " }).trackingCode).toBeUndefined();
  });
});

describe("chatSendSchema", () => {
  it("turns a blank body into undefined, leaving the one-of check to the service", () => {
    // An image-only message is legal, so an empty body cannot be an error here —
    // the schema never sees the attachment. The service rejects "neither".
    expect(chatSendSchema.parse({ body: "   " }).body).toBeUndefined();
    expect(chatSendSchema.parse({}).body).toBeUndefined();
  });

  it("accepts a message at the cap and rejects one past it", () => {
    expect(chatSendSchema.safeParse({ body: "a".repeat(MESSAGE_MAX_CHARS) }).success).toBe(true);
    expect(chatSendSchema.safeParse({ body: "a".repeat(MESSAGE_MAX_CHARS + 1) }).success).toBe(
      false,
    );
  });

  it("trims a message so trailing whitespace cannot pad it past the cap", () => {
    expect(chatSendSchema.parse({ body: "  where is my parcel  " }).body).toBe(
      "where is my parcel",
    );
  });
});

describe("chatImageSchema", () => {
  it("accepts every format the shipment module already accepts", () => {
    for (const type of CHAT_IMAGE_MIME_TYPES) {
      expect(chatImageSchema.safeParse({ type, size: 1_000 }).success).toBe(true);
    }
  });

  it("reuses the shipment MIME list rather than restating it", () => {
    // A second list would drift. Pinned so a format added in one place cannot
    // silently be missing from the other.
    expect(CHAT_IMAGE_MIME_TYPES).toBe(PHOTO_MIME_TYPES);
  });

  it("rejects a format Cloudinary would refuse anyway", () => {
    expect(chatImageSchema.safeParse({ type: "image/gif", size: 1_000 }).success).toBe(false);
    expect(chatImageSchema.safeParse({ type: "application/pdf", size: 1_000 }).success).toBe(false);
  });

  it("rejects an empty file and one over the cap, and accepts one exactly at it", () => {
    expect(chatImageSchema.safeParse({ type: "image/png", size: 0 }).success).toBe(false);
    expect(
      chatImageSchema.safeParse({ type: "image/png", size: CHAT_IMAGE_MAX_BYTES }).success,
    ).toBe(true);
    expect(
      chatImageSchema.safeParse({ type: "image/png", size: CHAT_IMAGE_MAX_BYTES + 1 }).success,
    ).toBe(false);
  });

  it("caps a chat attachment well below a consignment photo", () => {
    // Deliberate asymmetry: a consignment photo is evidence uploaded from a
    // desk, a chat attachment is a phone screenshot in a 320px bubble.
    expect(CHAT_IMAGE_MAX_BYTES).toBeLessThan(PHOTO_MAX_BYTES);
  });
});

describe("token shapes", () => {
  it("matches exactly what the service's generators produce", () => {
    // The guard and the generator are in different files, and a mismatch would
    // reject every real token while looking entirely correct in both places.
    expect(randomBytes(32).toString("base64url")).toMatch(VISITOR_TOKEN_PATTERN);
    expect(randomBytes(16).toString("base64url")).toMatch(VISITOR_ID_PATTERN);
  });

  it("rejects the shapes an attacker would try, before any database round trip", () => {
    expect(VISITOR_TOKEN_PATTERN.test("")).toBe(false);
    expect(VISITOR_TOKEN_PATTERN.test("a".repeat(42))).toBe(false);
    expect(VISITOR_TOKEN_PATTERN.test("a".repeat(44))).toBe(false);
    // Base64url emits no padding and no slashes, so neither may pass.
    expect(VISITOR_TOKEN_PATTERN.test(`${"a".repeat(42)}=`)).toBe(false);
    expect(VISITOR_TOKEN_PATTERN.test(`${"a".repeat(42)}/`)).toBe(false);
  });
});

describe("chatCursorSchema", () => {
  it("falls back to the start of the thread rather than throwing on a hand-edited URL", () => {
    expect(chatCursorSchema.parse("abc")).toBe(0);
    expect(chatCursorSchema.parse(-5)).toBe(0);
    expect(chatCursorSchema.parse(undefined)).toBe(0);
  });

  it("coerces the string a query param always is", () => {
    expect(chatCursorSchema.parse("42")).toBe(42);
  });
});

describe("chatListQuerySchema", () => {
  it("renders page 1 instead of an error page for a hand-edited query string", () => {
    const parsed = chatListQuerySchema.parse({ status: "exploded", page: "-3", unread: "maybe" });

    expect(parsed.status).toBeUndefined();
    expect(parsed.page).toBe(1);
    expect(parsed.unread).toBeUndefined();
  });

  it("does not let ?unread=0 switch the filter on", () => {
    // z.coerce.boolean() would: Boolean("0") is true. That is the whole reason
    // this field is an allow-list of affirmative spellings.
    expect(chatListQuerySchema.parse({ unread: "0" }).unread).toBeUndefined();
    expect(chatListQuerySchema.parse({ unread: "false" }).unread).toBeUndefined();
    expect(chatListQuerySchema.parse({ unread: "1" }).unread).toBe(true);
  });

  it("treats a blank search box as no filter", () => {
    expect(chatListQuerySchema.parse({ q: "   " }).q).toBeUndefined();
  });
});
