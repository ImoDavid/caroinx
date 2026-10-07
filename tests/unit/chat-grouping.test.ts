import { describe, expect, it } from "vitest";

import { groupMessages, RUN_GAP_MS, type GroupableMessage } from "@/lib/chat-grouping";
import type { ChatAuthor } from "@/validations/chat";

/** `seq` is the per-conversation cursor the real messages carry (rule 44). */
function message(seq: number, author: ChatAuthor, sentAt: string): GroupableMessage {
  return { seq, author, sentAt };
}

const BASE = Date.parse("2026-03-12T09:00:00.000Z");

function at(offsetMs: number): string {
  return new Date(BASE + offsetMs).toISOString();
}

describe("groupMessages", () => {
  it("returns nothing for an empty thread", () => {
    expect(groupMessages([])).toEqual([]);
  });

  it("collapses consecutive messages from one author into a single run", () => {
    const days = groupMessages([
      message(1, "visitor", at(0)),
      message(2, "visitor", at(1000)),
      message(3, "visitor", at(2000)),
    ]);

    expect(days).toHaveLength(1);
    expect(days[0]?.runs).toHaveLength(1);
    expect(days[0]?.runs[0]?.items).toHaveLength(3);
  });

  it("marks only the first and last of a run, so the label and time render once", () => {
    const days = groupMessages([
      message(1, "visitor", at(0)),
      message(2, "visitor", at(1000)),
      message(3, "visitor", at(2000)),
    ]);

    const items = days[0]?.runs[0]?.items ?? [];
    expect(items.map((item) => item.first)).toEqual([true, false, false]);
    expect(items.map((item) => item.last)).toEqual([false, false, true]);
  });

  it("a single message is both the first and the last of its run", () => {
    const [day] = groupMessages([message(1, "admin", at(0))]);

    expect(day?.runs[0]?.items).toEqual([
      { message: message(1, "admin", at(0)), first: true, last: true },
    ]);
  });

  it("starts a new run when the author changes", () => {
    const days = groupMessages([
      message(1, "visitor", at(0)),
      message(2, "admin", at(1000)),
      message(3, "visitor", at(2000)),
    ]);

    expect(days[0]?.runs.map((run) => run.author)).toEqual(["visitor", "admin", "visitor"]);
  });

  it("starts a new run when the same author pauses longer than the gap", () => {
    const days = groupMessages([
      message(1, "visitor", at(0)),
      message(2, "visitor", at(RUN_GAP_MS + 1)),
    ]);

    expect(days[0]?.runs).toHaveLength(2);
  });

  it("keeps a run together exactly at the gap boundary", () => {
    const days = groupMessages([
      message(1, "visitor", at(0)),
      message(2, "visitor", at(RUN_GAP_MS)),
    ]);

    expect(days[0]?.runs).toHaveLength(1);
  });

  it("keys a run by the seq of the message that opens it", () => {
    const days = groupMessages([message(7, "visitor", at(0)), message(8, "admin", at(1000))]);

    expect(days[0]?.runs.map((run) => run.key)).toEqual([7, 8]);
  });

  describe("day bucketing", () => {
    it("splits across a UTC midnight even when the messages are seconds apart", () => {
      const days = groupMessages([
        message(1, "visitor", "2026-03-12T23:59:59.000Z"),
        message(2, "visitor", "2026-03-13T00:00:01.000Z"),
      ]);

      expect(days.map((day) => day.key)).toEqual(["2026-03-12", "2026-03-13"]);
    });

    it("never merges a run across a day boundary, even inside the gap window", () => {
      const days = groupMessages([
        message(1, "visitor", "2026-03-12T23:59:59.000Z"),
        message(2, "visitor", "2026-03-13T00:00:01.000Z"),
      ]);

      expect(days[0]?.runs).toHaveLength(1);
      expect(days[1]?.runs).toHaveLength(1);
    });

    it("carries the first message's instant so a formatter can render the heading", () => {
      const [day] = groupMessages([message(1, "visitor", "2026-03-12T09:00:00.000Z")]);

      expect(day?.isoDate).toBe("2026-03-12T09:00:00.000Z");
    });

    it("groups a whole day together regardless of how many runs it holds", () => {
      const days = groupMessages([
        message(1, "visitor", "2026-03-12T01:00:00.000Z"),
        message(2, "admin", "2026-03-12T12:00:00.000Z"),
        message(3, "visitor", "2026-03-12T23:00:00.000Z"),
      ]);

      expect(days).toHaveLength(1);
      expect(days[0]?.runs).toHaveLength(3);
    });
  });

  it("still renders a message whose timestamp cannot be parsed", () => {
    // A stored record must never vanish from the thread because of a bad date.
    const days = groupMessages([
      message(1, "visitor", "not-a-date"),
      message(2, "visitor", "not-a-date"),
    ]);

    const total = days.flatMap((day) => day.runs).flatMap((run) => run.items);
    expect(total).toHaveLength(2);
  });
});
