import type { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { generateVisitorId, startConversation } from "@/services/chat.service";
import { VISITOR_COOKIE, VISITOR_ID_PATTERN } from "@/validations/chat";

import { visitorMetaFrom } from "../_meta";
import { chatError, chatJson, setChatCookies } from "../_respond";

/**
 * Opens a support conversation from the pre-chat form.
 *
 * A Route Handler rather than a Server Action because its entire point is a
 * response header: it must SET two cookies, and cookies cannot be set during
 * render (gap 4). Invoking a Server Action from the statically prerendered `/`
 * would also drag the router through a revalidation round trip on every call.
 *
 * No `export const dynamic`: Route Handlers are not cached in this version of
 * Next, and this one reads cookies and headers anyway — `force-dynamic` would be
 * dead configuration, the same reasoning rule 36 applies to `/track`.
 *
 * Unauthenticated and unrate-limited in code. The real defence is a Vercel
 * Firewall rule on this exact path (~5/min/IP), because creating a conversation
 * is a deliberate act rather than a poll — see gap 23.
 */
export async function POST(request: NextRequest): Promise<Response> {
  // Reused when the browser already has one, so the per-visitor cap survives a
  // page reload. Validated by shape first: a hand-edited cookie must not become
  // an unbounded key, and a fresh id is the safe fallback.
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existing && VISITOR_ID_PATTERN.test(existing) ? existing : generateVisitorId();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return chatError("Send a name to start a conversation.", 400);
  }

  try {
    const result = await startConversation(payload, visitorId, visitorMetaFrom(request));

    if (result === "invalid") {
      return chatError("Tell us your name to start a conversation.", 422);
    }
    if (result === "too-many") {
      return chatError("You already have a few conversations open with us.", 429);
    }

    return setChatCookies(chatJson(result.poll, 201), result.token, visitorId);
  } catch (error) {
    logger.error("failed to start a chat conversation", { error });
    return chatError("Something went wrong. Please try again.", 500);
  }
}
