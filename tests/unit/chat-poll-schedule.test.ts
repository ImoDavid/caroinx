import { describe, expect, it } from "vitest";

import {
  CHAT_POLL_ACTIVE_MS,
  CHAT_POLL_ACTIVE_WINDOW_MS,
  CHAT_POLL_BACKOFF_MAX_MS,
  CHAT_POLL_IDLE_MS,
  type PollState,
  isPresent,
  nextPollDelay,
} from "@/lib/chat-poll-schedule";
import { CHAT_PRESENCE_WINDOW_MS } from "@/validations/chat";

/**
 * Every pacing decision the chat transport makes.
 *
 * This file carries the whole weight of the polling design: the hook that calls
 * `nextPollDelay` is one timer and one AbortController, and is deliberately left
 * untested rather than tested badly under jsdom. If a cadence question matters,
 * it is answered here.
 */

const NOW = 1_700_000_000_000;

function state(overrides: Partial<PollState> = {}): PollState {
  return {
    hidden: false,
    enabled: true,
    focused: true,
    hasMore: false,
    lastActivityAt: NOW,
    consecutiveErrors: 0,
    now: NOW,
    ...overrides,
  };
}

describe("nextPollDelay", () => {
  it("schedules nothing while the tab is hidden, because nobody is watching", () => {
    expect(nextPollDelay(state({ hidden: true }))).toBeNull();
  });

  it("schedules nothing before a conversation exists, so an untouched widget is free", () => {
    // A visitor who never opens the panel must cost exactly zero requests.
    expect(nextPollDelay(state({ enabled: false }))).toBeNull();
  });

  it("keeps polling at the idle rate when the panel is CLOSED", () => {
    // Load-bearing. Stopping entirely would mean a closed widget never learns
    // the admin replied, so the visitor would have to reopen the panel on a
    // hunch. The idle poll exists only to raise the launcher's unread dot.
    expect(nextPollDelay(state({ focused: false }))).toBe(CHAT_POLL_IDLE_MS);
  });

  it("polls fast while a conversation is actually being had", () => {
    expect(nextPollDelay(state({ lastActivityAt: NOW - 5_000 }))).toBe(CHAT_POLL_ACTIVE_MS);
  });

  it("drops back to idle once the conversation goes quiet", () => {
    // An open panel nobody is typing into is not worth 20 requests a minute.
    expect(nextPollDelay(state({ lastActivityAt: NOW - CHAT_POLL_ACTIVE_WINDOW_MS - 1 }))).toBe(
      CHAT_POLL_IDLE_MS,
    );
  });

  it("fires immediately when the last page was capped, to drain the backlog", () => {
    expect(nextPollDelay(state({ hasMore: true }))).toBe(0);
  });

  it("backs off exponentially and never waits longer than the cap", () => {
    expect(nextPollDelay(state({ consecutiveErrors: 1 }))).toBe(CHAT_POLL_ACTIVE_MS * 2);
    expect(nextPollDelay(state({ consecutiveErrors: 2 }))).toBe(CHAT_POLL_ACTIVE_MS * 4);
    expect(nextPollDelay(state({ consecutiveErrors: 20 }))).toBe(CHAT_POLL_BACKOFF_MAX_MS);
  });

  it("backs off rather than draining when a capped page is followed by failures", () => {
    // `hasMore` describes the last SUCCESSFUL response. Honouring it during an
    // outage would hammer a server that is already failing.
    expect(nextPollDelay(state({ hasMore: true, consecutiveErrors: 1 }))).toBe(
      CHAT_POLL_ACTIVE_MS * 2,
    );
  });

  it("lets hidden win over every other signal", () => {
    expect(nextPollDelay(state({ hidden: true, hasMore: true, consecutiveErrors: 3 }))).toBeNull();
  });
});

describe("isPresent", () => {
  it("treats a never-seen party as absent rather than throwing", () => {
    expect(isPresent(undefined, CHAT_PRESENCE_WINDOW_MS, NOW)).toBe(false);
  });

  it("counts a recent timestamp as present and a stale one as gone", () => {
    expect(isPresent(new Date(NOW - 1_000), CHAT_PRESENCE_WINDOW_MS, NOW)).toBe(true);
    expect(
      isPresent(new Date(NOW - CHAT_PRESENCE_WINDOW_MS - 1), CHAT_PRESENCE_WINDOW_MS, NOW),
    ).toBe(false);
  });

  it("uses a window wider than the presence write throttle", () => {
    // Presence is written at most once every CHAT_PRESENCE_THROTTLE_MS, so a
    // window narrower than that would flicker someone offline between writes.
    expect(CHAT_PRESENCE_WINDOW_MS).toBeGreaterThan(CHAT_POLL_IDLE_MS);
  });
});
