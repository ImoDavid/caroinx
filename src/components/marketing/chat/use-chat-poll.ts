"use client";

import { useEffect, useRef } from "react";

import { nextPollDelay } from "@/lib/chat-poll-schedule";
import type { VisitorPoll } from "@/types/chat-visitor";

import { pollChat } from "./chat-api";

/**
 * Drives the cursor poll.
 *
 * Plumbing only, on purpose: one `setTimeout` chain, one `AbortController` and
 * one `visibilitychange` listener. Every DECISION about WHEN to poll lives in
 * `nextPollDelay` (`@/lib/chat-poll-schedule`), which is pure and covered
 * exhaustively in the `node` test project — because fake timers interleaved with
 * real `fetch` promises under jsdom produce tests that assert the mock's shape
 * rather than this hook's behaviour, and `document.visibilityState` is not
 * writable without `defineProperty` surgery in every case.
 *
 * So: if a cadence question matters, add a case to `nextPollDelay`, not a test
 * for this file. See rule 43.
 *
 * `setTimeout` chain rather than `setInterval`: an interval stacks requests
 * whenever one response is slow, and on a cold serverless start that is four in
 * flight at once.
 */

export type UseChatPollOptions = {
  /** There is a conversation to poll for. False costs the visitor zero requests. */
  enabled: boolean;
  /** The panel is on screen. A closed panel still polls, at the idle rate. */
  panelOpen: boolean;
  /**
   * The cursor, held in a ref rather than state so a stale closure cannot
   * re-request a window that has already been merged.
   */
  cursorRef: { current: number };
  /** Epoch ms of the last message either way, so the schedule can go active. */
  lastActivityAt: number;
  onPoll: (poll: VisitorPoll) => void;
  /** 204/401/404 — stop, drop local state, show the pre-chat form. */
  onGone: () => void;
};

export function useChatPoll(options: UseChatPollOptions): void {
  const { enabled, panelOpen, cursorRef } = options;

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
    if (!enabled) return;

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
        enabled: true,
        focused: panelOpen,
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

      const outcome = await pollChat(cursorRef.current, panelOpen, controller.signal);
      if (cancelled) return;

      switch (outcome.kind) {
        case "aborted":
          // NOT a failure. Counting it would back the widget off every time the
          // visitor switches tabs. Whoever aborted us reschedules.
          return;
        case "gone":
          errors.current = 0;
          hasMore.current = false;
          clearTimer();
          latest.current.onGone();
          return;
        case "error":
          errors.current += 1;
          break;
        case "ok":
          errors.current = 0;
          hasMore.current = outcome.poll.hasMore;
          if (outcome.poll.cursor > cursorRef.current) cursorRef.current = outcome.poll.cursor;
          latest.current.onPoll(outcome.poll);
          break;
      }

      plan();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        // Stop dead: polling a tab nobody is looking at is the single biggest
        // source of wasted invocations.
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
  }, [enabled, panelOpen, cursorRef]);
}
