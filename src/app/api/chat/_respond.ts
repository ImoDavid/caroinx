import "server-only";

import { NextResponse } from "next/server";

import { isProduction } from "@/lib/env";
import { CHAT_COOKIE, CHAT_COOKIE_MAX_AGE_SECONDS, VISITOR_COOKIE } from "@/validations/chat";

/**
 * Shared response shaping for the chat endpoints.
 *
 * Not a route — see the note in `_meta.ts`.
 */

/**
 * A poll endpoint must never be served from a cache, by the browser or by
 * anything between it and us. Route Handlers are not cached by Next in this
 * version, so this is about everything else on the wire.
 */
const NO_STORE = { "Cache-Control": "no-store" } as const;

export function chatJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** 204 means "you have no conversation" — the widget reads it as "show the form". */
export function chatNoContent(): NextResponse {
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}

export function chatError(error: string, status: number): NextResponse {
  return chatJson({ error }, status);
}

/**
 * Both cookies, with the properties that make them safe.
 *
 * - `httpOnly`: the chat token is a credential (rule 46); `document.cookie` must
 *   not hand it to any script running on a marketing page.
 * - `sameSite: "lax"`, not `"strict"`: strict drops the cookie on a cross-site
 *   navigation INTO the site, so a visitor arriving from a search result would
 *   silently lose their thread. Lax also gives CSRF protection for free here —
 *   it is not sent on a cross-site POST, and no GET in this feature mutates
 *   anything a forged request could abuse.
 * - 30 days rather than the long life a counter would prefer, as the compromise
 *   for shipping two first-party cookies with no consent banner (gap 25).
 */
export function setChatCookies(
  response: NextResponse,
  token: string,
  visitorId: string,
): NextResponse {
  const base = {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: CHAT_COOKIE_MAX_AGE_SECONDS,
  } as const;

  response.cookies.set(CHAT_COOKIE, token, base);
  response.cookies.set(VISITOR_COOKIE, visitorId, base);
  return response;
}
