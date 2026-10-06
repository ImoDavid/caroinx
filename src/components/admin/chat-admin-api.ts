"use client";

import type { AdminPoll } from "@/types/chat";

/**
 * The admin side's typed poll call. The only admin module that knows a URL.
 *
 * Returns a discriminated outcome rather than throwing, for the same reason the
 * widget's `chat-api.ts` does: an abort happens every time the tab is
 * backgrounded and must not be mistaken for a failure.
 *
 * `signOut` is distinct from `error` because it is terminal — the handler
 * answers 401 rather than redirecting (rule 64), and the client must stop
 * polling instead of backing off forever.
 */

const POLL_URL = "/api/admin/chat/poll";

export type AdminPollOutcome =
  | { kind: "ok"; poll: AdminPoll }
  | { kind: "signedOut" }
  /** The conversation is gone. Stop polling this thread. */
  | { kind: "gone" }
  | { kind: "error" }
  | { kind: "aborted" };

export async function pollAdminChat(
  options: { conversationId?: string; after?: number },
  signal: AbortSignal,
): Promise<AdminPollOutcome> {
  const query = new URLSearchParams();
  if (options.conversationId) {
    query.set("conversationId", options.conversationId);
    query.set("after", String(options.after ?? 0));
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  try {
    const response = await fetch(`${POLL_URL}${suffix}`, { cache: "no-store", signal });

    if (response.status === 401) return { kind: "signedOut" };
    if (response.status === 404) return { kind: "gone" };
    if (!response.ok) return { kind: "error" };

    return { kind: "ok", poll: (await response.json()) as AdminPoll };
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError"
      ? { kind: "aborted" }
      : { kind: "error" };
  }
}
