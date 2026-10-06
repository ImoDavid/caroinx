"use client";

import type { VisitorMessage, VisitorPoll } from "@/types/chat-visitor";

/**
 * The only module in the widget that knows a URL.
 *
 * Every call takes an `AbortSignal` and returns a discriminated outcome rather
 * than throwing, so the caller never has to tell a cancelled request apart from
 * a failed one by inspecting an error — which matters because an abort happens
 * every time the visitor switches tabs and must not count as a failure.
 *
 * Client-only: it speaks `fetch` to the Route Handlers. It may not import
 * `@/services/*` (the eslint client glob), so its shapes come from
 * `@/types/chat-visitor`.
 */

const CONVERSATIONS_URL = "/api/chat/conversations";
const MESSAGES_URL = "/api/chat/messages";

/** Every response is `no-store`, but asking is what stops a browser heuristic. */
const NO_STORE: RequestInit = { cache: "no-store" };

function aborted(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  return typeof payload === "object" && payload !== null && "error" in payload
    ? String(payload.error)
    : fallback;
}

export type PollOutcome =
  | { kind: "ok"; poll: VisitorPoll }
  /** No conversation, or one this browser may no longer read. Reset to the form. */
  | { kind: "gone" }
  | { kind: "error" }
  | { kind: "aborted" };

export async function pollChat(
  after: number,
  panelOpen: boolean,
  signal: AbortSignal,
): Promise<PollOutcome> {
  const query = new URLSearchParams({ after: String(after) });
  if (panelOpen) query.set("open", "1");

  try {
    const response = await fetch(`${MESSAGES_URL}?${query.toString()}`, { ...NO_STORE, signal });

    // 204 is "you have no conversation"; 401/404 is "not yours any more". Both
    // mean stop polling and show the pre-chat form — never retry.
    if (response.status === 204 || response.status === 401 || response.status === 404) {
      return { kind: "gone" };
    }
    if (!response.ok) return { kind: "error" };

    return { kind: "ok", poll: (await response.json()) as VisitorPoll };
  } catch (error) {
    return aborted(error) ? { kind: "aborted" } : { kind: "error" };
  }
}

export type StartOutcome =
  { kind: "ok"; poll: VisitorPoll } | { kind: "error"; message: string } | { kind: "aborted" };

export type StartInput = {
  name: string;
  email?: string;
  trackingCode?: string;
};

export async function startChat(input: StartInput, signal?: AbortSignal): Promise<StartOutcome> {
  try {
    const response = await fetch(CONVERSATIONS_URL, {
      ...NO_STORE,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });

    if (!response.ok) {
      return {
        kind: "error",
        message: await errorMessage(response, "We could not start a conversation just now."),
      };
    }

    return { kind: "ok", poll: (await response.json()) as VisitorPoll };
  } catch (error) {
    return aborted(error) ? { kind: "aborted" } : { kind: "error", message: "No connection." };
  }
}

export type SendOutcome =
  | { kind: "ok"; message: VisitorMessage; cursor: number }
  | { kind: "gone" }
  | { kind: "error"; message: string }
  | { kind: "aborted" };

/**
 * `multipart/form-data` so one request carries the text and the attachment —
 * and `FormData` sets its own boundary, so the content-type is deliberately NOT
 * set here.
 */
export async function sendChatMessage(
  body: string | undefined,
  image: File | undefined,
  signal?: AbortSignal,
): Promise<SendOutcome> {
  const form = new FormData();
  if (body) form.set("body", body);
  if (image) form.set("image", image);

  try {
    const response = await fetch(MESSAGES_URL, {
      ...NO_STORE,
      method: "POST",
      body: form,
      signal,
    });

    if (response.status === 401) return { kind: "gone" };
    if (!response.ok) {
      return {
        kind: "error",
        message: await errorMessage(response, "That message was not sent."),
      };
    }

    const payload = (await response.json()) as { message: VisitorMessage; cursor: number };
    return { kind: "ok", message: payload.message, cursor: payload.cursor };
  } catch (error) {
    return aborted(error) ? { kind: "aborted" } : { kind: "error", message: "No connection." };
  }
}
