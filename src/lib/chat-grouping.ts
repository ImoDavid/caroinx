import type { ChatAuthor } from "@/validations/chat";

/**
 * Turns a flat message list into the shape a messaging UI renders: day
 * sections, and within each day runs of consecutive messages from one author.
 *
 * A pure module rather than logic inside `chat-message-list.tsx`, for the reason
 * CLAUDE.md rule 43 gives for `chat-poll-schedule.ts`: every decision here is
 * exhaustively testable in the `node` project, while the component stays a
 * renderer with nothing to assert but markup.
 *
 * Client-safe: no `server-only`, no environment access, no dependencies.
 */

/** Two messages from one author further apart than this start a new run. */
export const RUN_GAP_MS = 5 * 60 * 1000;

export type GroupableMessage = {
  seq: number;
  author: ChatAuthor;
  sentAt: string;
};

export type GroupedMessage<M extends GroupableMessage> = {
  message: M;
  /** Render the author label above this bubble. */
  first: boolean;
  /** Render the timestamp below this bubble. */
  last: boolean;
};

export type MessageRun<M extends GroupableMessage> = {
  /** Stable across renders: a run is identified by the message that opens it. */
  key: number;
  author: ChatAuthor;
  items: GroupedMessage<M>[];
};

export type MessageDay<M extends GroupableMessage> = {
  /** `YYYY-MM-DD`, in UTC. */
  key: string;
  /** The ISO instant of the first message, for a formatter to render. */
  isoDate: string;
  runs: MessageRun<M>[];
};

/**
 * UTC, deliberately.
 *
 * `lib/format.ts` pins every formatter to UTC so the server and the browser
 * cannot disagree (CLAUDE.md rule 59), and the separator sits directly above
 * timestamps those formatters produce. Bucketing by local day would put a
 * message under a heading that contradicts the time printed beside it.
 */
function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * A message with an unparseable `sentAt` still has to render — it is a real
 * stored record, and dropping it would silently hide a conversation. It simply
 * never joins a run on time alone.
 */
function timeOf(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Number.NaN : ms;
}

function sameRun(previous: GroupableMessage, next: GroupableMessage): boolean {
  if (previous.author !== next.author) return false;

  const a = timeOf(previous.sentAt);
  const b = timeOf(next.sentAt);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;

  // Absolute difference: the caller is responsible for ordering, and a pair
  // that arrives out of order should not silently read as a huge negative gap.
  return Math.abs(b - a) <= RUN_GAP_MS;
}

/**
 * Groups messages that are ALREADY in display order. The admin thread sorts by
 * `seq` before rendering (`chat-thread-live.tsx`), which is the per-conversation
 * monotonic cursor rule 44 exists to provide, so this does not re-sort — doing
 * so would quietly disagree with the order the list was merged in.
 */
export function groupMessages<M extends GroupableMessage>(messages: readonly M[]): MessageDay<M>[] {
  const days: MessageDay<M>[] = [];

  for (const message of messages) {
    const dayKey = utcDayKey(message.sentAt);
    let day = days.at(-1);

    if (!day || day.key !== dayKey) {
      day = { key: dayKey, isoDate: message.sentAt, runs: [] };
      days.push(day);
    }

    const run = day.runs.at(-1);
    const previous = run?.items.at(-1)?.message;

    if (run && previous && sameRun(previous, message)) {
      run.items.push({ message, first: false, last: true });
      // The run's previous tail is no longer the tail.
      const tail = run.items.at(-2);
      if (tail) tail.last = false;
    } else {
      day.runs.push({
        key: message.seq,
        author: message.author,
        items: [{ message, first: true, last: true }],
      });
    }
  }

  return days;
}
