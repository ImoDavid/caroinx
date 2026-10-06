import type mongoose from "mongoose";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET as pollMessages, POST as sendMessage } from "@/app/api/chat/messages/route";
import { POST as createConversation } from "@/app/api/chat/conversations/route";
import {
  CHAT_COOKIE,
  CHAT_IMAGE_MAX_BYTES,
  MESSAGES_PER_CONVERSATION_MAX,
  VISITOR_COOKIE,
} from "@/validations/chat";

import { openTestConnection, TEST_BASE_URL } from "../helpers/db.ts";

/**
 * The visitor transport, exercised by calling the Route Handlers' own exports
 * with a real `NextRequest` — the `auth-route.test.ts` pattern, no dev server.
 *
 * `NextRequest` is what makes this possible with no mocking at all: the handlers
 * read cookies off the request and write them onto the response rather than
 * calling `cookies()` from `next/headers`, which throws outside a request scope.
 *
 * Not covered here: the image path. It ends in a real Cloudinary upload, and
 * mocking `fetch` to "test" it would assert the mock. The size and type guards
 * ARE covered, because those run before any upload.
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
});

function request(path: string, init: RequestInit & { cookie?: string } = {}): NextRequest {
  const { cookie, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(new Request(`${TEST_BASE_URL}${path}`, { ...rest, headers }));
}

/** Reads a Set-Cookie value the handler wrote, by name. */
function cookieFrom(response: Response, name: string): string | undefined {
  return response.headers
    .getSetCookie()
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split(";")[0]
    ?.split("=")[1];
}

async function startViaHttp(body: unknown = { name: "Ada Okafor" }): Promise<{
  response: Response;
  token: string;
}> {
  const response = await createConversation(
    request("/api/chat/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { response, token: cookieFrom(response, CHAT_COOKIE) ?? "" };
}

describe("POST /api/chat/conversations", () => {
  it("sets both cookies httpOnly and returns the empty thread", async () => {
    const { response, token } = await startViaHttp();

    expect(response.status).toBe(201);
    expect(token).toHaveLength(43);

    const cookies = response.headers.getSetCookie().join("; ");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=lax");
    expect(cookies).toContain(`${VISITOR_COOKIE}=`);

    const body = (await response.json()) as { messages: unknown[]; cursor: number };
    expect(body.messages).toEqual([]);
    expect(body.cursor).toBe(0);
  });

  it("never serves a poll or a create from a cache", async () => {
    const { response } = await startViaHttp();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("publishes no credential in the response body", async () => {
    // The token travels in an httpOnly cookie and nowhere else (rule 46).
    const { response, token } = await startViaHttp();
    expect(JSON.stringify(await response.json())).not.toContain(token);
  });

  it("answers 422 for a nameless payload and 400 for a non-JSON body", async () => {
    const nameless = await createConversation(
      request("/api/chat/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "" }),
      }),
    );
    expect(nameless.status).toBe(422);

    const garbage = await createConversation(
      request("/api/chat/conversations", { method: "POST", body: "not json" }),
    );
    expect(garbage.status).toBe(400);
  });

  it("reuses an existing visitor cookie rather than minting a new identity", async () => {
    const first = await startViaHttp();
    const visitorId = cookieFrom(first.response, VISITOR_COOKIE);

    const second = await createConversation(
      request("/api/chat/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cookie: `${VISITOR_COOKIE}=${visitorId}`,
        body: JSON.stringify({ name: "Ada" }),
      }),
    );

    expect(cookieFrom(second, VISITOR_COOKIE)).toBe(visitorId);
  });
});

describe("GET /api/chat/messages", () => {
  it("answers 204 with no cookie, which the widget reads as 'show the form'", async () => {
    const response = await pollMessages(request("/api/chat/messages?after=0"));

    expect(response.status).toBe(204);
    // Also why there is no separate session endpoint: this call answers it.
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 204 for a cookie that cannot correspond to a conversation", async () => {
    const forged = await pollMessages(
      request("/api/chat/messages?after=0", { cookie: `${CHAT_COOKIE}=not-a-real-token` }),
    );
    expect(forged.status).toBe(204);
  });

  it("returns an empty array once caught up rather than 204", async () => {
    // The distinction matters: 204 means "you have no conversation", while
    // `{ messages: [] }` means "nothing new" and must not reset the widget.
    const { token } = await startViaHttp();

    const response = await pollMessages(
      request("/api/chat/messages?after=0", { cookie: `${CHAT_COOKIE}=${token}` }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { messages: unknown[] };
    expect(body.messages).toEqual([]);
  });

  it("clamps a hand-edited cursor instead of failing", async () => {
    const { token } = await startViaHttp();

    const response = await pollMessages(
      request("/api/chat/messages?after=not-a-number", { cookie: `${CHAT_COOKIE}=${token}` }),
    );

    expect(response.status).toBe(200);
  });
});

describe("POST /api/chat/messages", () => {
  function send(token: string, fields: Record<string, string>): Promise<Response> {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return sendMessage(
      request("/api/chat/messages", {
        method: "POST",
        cookie: `${CHAT_COOKIE}=${token}`,
        body: form,
      }),
    );
  }

  it("appends a message and returns its cursor", async () => {
    const { token } = await startViaHttp();

    const response = await send(token, { body: "where is my parcel" });

    expect(response.status).toBe(201);
    const payload = (await response.json()) as { cursor: number; message: { body: string } };
    expect(payload.cursor).toBe(1);
    expect(payload.message.body).toBe("where is my parcel");
  });

  it("answers 401 with no cookie, so the widget resets instead of retrying", async () => {
    const form = new FormData();
    form.set("body", "hello");
    const response = await sendMessage(
      request("/api/chat/messages", { method: "POST", body: form }),
    );

    expect(response.status).toBe(401);
  });

  it("answers 422 for a message that is neither text nor image", async () => {
    const { token } = await startViaHttp();
    expect((await send(token, { body: "   " })).status).toBe(422);
  });

  it("rejects an oversize body on content-length, before buffering it", async () => {
    // There is no platform 413 here: bodySizeLimit covers Server Actions only
    // (rule 42). Without this check a 4 MB image would simply be accepted.
    const { token } = await startViaHttp();

    const response = await sendMessage(
      request("/api/chat/messages", {
        method: "POST",
        cookie: `${CHAT_COOKIE}=${token}`,
        headers: { "content-length": String(CHAT_IMAGE_MAX_BYTES * 4) },
        body: new FormData(),
      }),
    );

    expect(response.status).toBe(413);
  });

  it("refuses an attachment before any text has been sent", async () => {
    const { token } = await startViaHttp();

    const form = new FormData();
    form.set("image", new File(["x".repeat(64)], "a.png", { type: "image/png" }));
    const response = await sendMessage(
      request("/api/chat/messages", {
        method: "POST",
        cookie: `${CHAT_COOKIE}=${token}`,
        body: form,
      }),
    );

    expect(response.status).toBe(409);
  });

  it("rejects a disallowed file type before reserving a slot or uploading", async () => {
    const { token } = await startViaHttp();
    await send(token, { body: "first" });

    const form = new FormData();
    form.set("image", new File(["%PDF-"], "a.pdf", { type: "application/pdf" }));
    const response = await sendMessage(
      request("/api/chat/messages", {
        method: "POST",
        cookie: `${CHAT_COOKIE}=${token}`,
        body: form,
      }),
    );

    expect(response.status).toBe(422);
    const stored = await db.collection("chatconversations").findOne({ visitorToken: token });
    // No slot was spent on a file that was never going to be accepted.
    expect(stored?.imageCount).toBe(0);
  });

  it("answers 429 once the conversation hits its message cap", async () => {
    const { token } = await startViaHttp();
    await db
      .collection("chatconversations")
      .updateOne(
        { visitorToken: token },
        { $set: { messageCount: MESSAGES_PER_CONVERSATION_MAX } },
      );

    expect((await send(token, { body: "one more" })).status).toBe(429);
  });
});
