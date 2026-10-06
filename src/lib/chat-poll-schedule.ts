/**
 * When the next chat poll should fire.
 *
 * Extracted as a pure function on purpose. The hook that calls it — one
 * `setTimeout`, one `AbortController`, one `visibilitychange` listener — is
 * plumbing that cannot be tested honestly under jsdom: fake timers interleaved
 * with real `fetch` promises make the test assert the mock's shape rather than
 * the behaviour, and `document.visibilityState` is not writable without
 * `defineProperty` surgery in every case. Every DECISION therefore lives here,
 * where it is covered exhaustively in the `node` project with no DOM at all.
 *
 * Do not "fix" the hook's missing test by writing a brittle one. Add a case
 * here instead.
 *
 * Client-safe: plain arithmetic, no dependencies, no React. Shared by the public
 * widget and the admin topbar bell.
 */

/** While a conversation is live and on screen. */
export const CHAT_POLL_ACTIVE_MS = 3_000;

/**
 * Everything else: a closed panel, a thread nobody has typed in for a minute,
 * and the admin bell. The widget's unread dot runs on this.
 */
export const CHAT_POLL_IDLE_MS = 15_000;

/** How long after the last message the thread still counts as active. */
export const CHAT_POLL_ACTIVE_WINDOW_MS = 60_000;

/** Exponential backoff never waits longer than this. */
export const CHAT_POLL_BACKOFF_MAX_MS = 60_000;

export type PollState = {
  /**
   * The tab is backgrounded. The hard stop — polling a tab nobody is looking at
   * is the single biggest source of wasted invocations.
   */
  hidden: boolean;
  /**
   * There is anything to poll for at all.
   *
   * Widget: a conversation exists. Before the pre-chat form is submitted there
   * is nothing to ask about, so the widget costs a visitor exactly zero
   * requests until they choose to start one.
   *
   * Bell: always true — there is always an unread count to fetch.
   */
  enabled: boolean;
  /**
   * The thread is on screen.
   *
   * Widget: the panel is open. A CLOSED panel still polls, at the idle rate, so
   * it can show a dot when a reply arrives — stopping entirely would mean a
   * closed widget never learns the admin answered.
   *
   * Bell: always false. It is a background count, never the active thread.
   */
  focused: boolean;
  /** The last response was a capped page, so more is already waiting. */
  hasMore: boolean;
  /** Epoch ms of the most recent message in either direction. Bell: 0. */
  lastActivityAt: number;
  /** Consecutive failed requests. An aborted request is NOT a failure. */
  consecutiveErrors: number;
  now: number;
};

/**
 * `null` means do not schedule anything. `0` means fire immediately.
 *
 * Order matters. Errors are checked BEFORE `hasMore` because `hasMore` reflects
 * the last *successful* response: draining pages while requests are failing
 * would hammer a server that is already struggling.
 */
export function nextPollDelay(state: PollState): number | null {
  if (state.hidden || !state.enabled) return null;

  if (state.consecutiveErrors > 0) {
    return Math.min(CHAT_POLL_ACTIVE_MS * 2 ** state.consecutiveErrors, CHAT_POLL_BACKOFF_MAX_MS);
  }

  if (state.hasMore) return 0;

  if (!state.focused) return CHAT_POLL_IDLE_MS;

  return state.now - state.lastActivityAt < CHAT_POLL_ACTIVE_WINDOW_MS
    ? CHAT_POLL_ACTIVE_MS
    : CHAT_POLL_IDLE_MS;
}

/**
 * Whether a presence timestamp is recent enough to call someone present.
 *
 * Takes the window as an argument so the caller supplies
 * `CHAT_PRESENCE_WINDOW_MS` from `@/validations/chat` — this module stays
 * dependency-free, which is what keeps it testable with no imports at all.
 */
export function isPresent(lastSeenAt: Date | undefined, windowMs: number, now: number): boolean {
  return lastSeenAt !== undefined && now - lastSeenAt.getTime() < windowMs;
}
