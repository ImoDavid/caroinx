"use client";

import { useEffect, useRef } from "react";

import { nextPollDelay } from "@/lib/chat-poll-schedule";
import type { AdminPoll } from "@/types/chat";

import { pollAdminChat } from "./chat-admin-api";

/**
 * The admin side's poll loop, shared by the topbar bell and the live thread.
 *
 * One implementation rather than two, because the mechanics are identical to the
 * public widget's: a `setTimeout` chain (never `setInterval`, which stacks
 * requests when one response is slow), one `AbortController`, and a
 * `visibilitychange` listener that stops dead on a backgrounded tab.
 *
 * Every pacing DECISION comes from `nextPollDelay` — the same pure function the
 * widget uses — so this file, like `use-chat-poll.ts`, is plumbing with no
 * judgement in it and is deliberately not unit-tested (rule 43).
 */

export type UseAdminChatPollOptions = {
  /**
   * Omit for the bell, which polls the unread count only. Supplying one also
   * fetches that thread's new messages.
   */
  conversationId?: string;
  /**
   * Whether this is the thread the admin is looking at. The bell passes false,
   * so it never polls at the active rate — a background count does not need to
   * be three seconds fresh.
   */
  focused: boolean;
  lastActivityAt: number;
  /** Thread mode only. A ref so a stale closure cannot re-request an old window. */
  cursorRef?: { current: number };
  onPoll: (poll: AdminPoll) => void;
  /** 404: the conversation was deleted. Thread mode only. */
  onGone?: () => void;
};

export function useAdminChatPoll(options: UseAdminChatPollOptions): void {
  const { conversationId, focused, cursorRef } = options;

  // Kept fresh without re-creating the loop, which would restart the schedule
  // on every new message.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const errors = useRef(0);
  const hasMore = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function clearTimer() {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    }

    function at(delay: number) {
      clearTimer();
      timer.current = setTimeout(() => void tick(), delay);
    }

    function plan() {
      if (cancelled) return;
      const delay = nextPollDelay({
        hidden: document.visibilityState === "hidden",
        // Always true: there is always an unread count worth fetching.
        enabled: true,
        focused,
        hasMore: hasMore.current,
        lastActivityAt: latest.current.lastActivityAt,
        consecutiveErrors: errors.current,
        now: Date.now(),
      });

      clearTimer();
      if (delay === null) return;
      at(delay);
    }

    async function tick() {
      if (cancelled) return;

      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      const outcome = await pollAdminChat(
        { conversationId, after: cursorRef?.current ?? 0 },
        controller.signal,
      );
      if (cancelled) return;

      switch (outcome.kind) {
        case "aborted":
          // Not a failure. Whoever aborted us reschedules.
          return;
        case "signedOut":
          // Terminal: the session is gone, so stop rather than hammering a 401.
          clearTimer();
          return;
        case "gone":
          clearTimer();
          latest.current.onGone?.();
          return;
        case "error":
          errors.current += 1;
          break;
        case "ok":
          errors.current = 0;
          hasMore.current = outcome.poll.hasMore ?? false;
          if (
            cursorRef &&
            outcome.poll.cursor !== undefined &&
            outcome.poll.cursor > cursorRef.current
          ) {
            cursorRef.current = outcome.poll.cursor;
          }
          latest.current.onPoll(outcome.poll);
          break;
      }

      plan();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        abort.current?.abort();
        clearTimer();
        return;
      }
      // Immediately, not on the next scheduled tick — a 15s wait after coming
      // back to the tab reads as broken.
      at(0);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    at(0);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      abort.current?.abort();
      clearTimer();
    };
  }, [conversationId, focused, cursorRef]);
}
