import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChatMessageList } from "@/components/admin/chat-message-list";
import type { ChatMessage } from "@/types/chat";
import type { ChatAuthor } from "@/validations/chat";

/**
 * `ChatMessageList` is `"use client"` and prop-driven precisely so it can be
 * mounted here (rule 61) — one implementation serves both the server-rendered
 * thread and the polling one, so this covers both.
 *
 * The grouping RULES are asserted in `tests/unit/chat-grouping.test.ts`; these
 * cases assert that the component renders what the grouping returns.
 */
function message(
  seq: number,
  author: ChatAuthor,
  sentAt: string,
  body = `Message ${String(seq)}`,
): ChatMessage {
  return { id: `m${String(seq)}`, seq, author, body, sentAt };
}

describe("ChatMessageList", () => {
  it("explains an empty thread rather than rendering nothing", () => {
    render(<ChatMessageList messages={[]} />);

    expect(screen.getByText(/has not written anything/i)).toBeInTheDocument();
  });

  it("renders every message body", () => {
    render(
      <ChatMessageList
        messages={[
          message(1, "visitor", "2026-03-12T09:00:00.000Z"),
          message(2, "admin", "2026-03-12T09:30:00.000Z"),
        ]}
      />,
    );

    expect(screen.getByText("Message 1")).toBeInTheDocument();
    expect(screen.getByText("Message 2")).toBeInTheDocument();
  });

  it("labels the author once per run, not once per bubble", () => {
    render(
      <ChatMessageList
        messages={[
          message(1, "visitor", "2026-03-12T09:00:00.000Z"),
          message(2, "visitor", "2026-03-12T09:00:30.000Z"),
          message(3, "visitor", "2026-03-12T09:01:00.000Z"),
        ]}
      />,
    );

    expect(screen.getAllByText("Visitor")).toHaveLength(1);
  });

  it("distinguishes the admin's own messages from the visitor's", () => {
    render(
      <ChatMessageList
        messages={[
          message(1, "visitor", "2026-03-12T09:00:00.000Z"),
          message(2, "admin", "2026-03-12T09:30:00.000Z"),
        ]}
      />,
    );

    expect(screen.getByText("Visitor")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("renders one timestamp per run, at its end", () => {
    const { container } = render(
      <ChatMessageList
        messages={[
          message(1, "visitor", "2026-03-12T09:00:00.000Z"),
          message(2, "visitor", "2026-03-12T09:01:00.000Z"),
        ]}
      />,
    );

    // One for the day separator, one for the single run.
    const times = container.querySelectorAll("time");
    expect(times).toHaveLength(2);
    expect(times[1]).toHaveAttribute("datetime", "2026-03-12T09:01:00.000Z");
  });

  describe("day separators", () => {
    it("renders one heading for a thread inside a single day", () => {
      render(
        <ChatMessageList
          messages={[
            message(1, "visitor", "2026-03-12T01:00:00.000Z"),
            message(2, "admin", "2026-03-12T23:00:00.000Z"),
          ]}
        />,
      );

      expect(screen.getAllByText("12 Mar 2026")).toHaveLength(1);
    });

    it("splits across a UTC midnight", () => {
      render(
        <ChatMessageList
          messages={[
            message(1, "visitor", "2026-03-12T23:59:00.000Z"),
            message(2, "visitor", "2026-03-13T00:01:00.000Z"),
          ]}
        />,
      );

      expect(screen.getByText("12 Mar 2026")).toBeInTheDocument();
      expect(screen.getByText("13 Mar 2026")).toBeInTheDocument();
    });

    it("dates are absolute, never 'Today' — the formatters are UTC-pinned", () => {
      render(<ChatMessageList messages={[message(1, "visitor", new Date().toISOString())]} />);

      expect(screen.queryByText(/today|yesterday/i)).not.toBeInTheDocument();
    });
  });

  it("renders an attachment with its stored aspect ratio reserved", () => {
    const withImage: ChatMessage = {
      id: "m1",
      seq: 1,
      author: "visitor",
      sentAt: "2026-03-12T09:00:00.000Z",
      image: { url: "https://res.cloudinary.com/demo/image/upload/x.jpg", width: 800, height: 600 },
    };

    render(<ChatMessageList messages={[withImage]} />);

    const image = screen.getByRole("img", { name: /attachment from the visitor/i });
    expect(image).toHaveAttribute("src", withImage.image?.url);
    expect(image).toHaveAttribute("width", "800");
  });

  it("names an image the admin sent as their own", () => {
    const withImage: ChatMessage = {
      id: "m1",
      seq: 1,
      author: "admin",
      sentAt: "2026-03-12T09:00:00.000Z",
      image: { url: "https://res.cloudinary.com/demo/image/upload/x.jpg", width: 10, height: 10 },
    };

    render(<ChatMessageList messages={[withImage]} />);

    expect(screen.getByRole("img", { name: /attachment you sent/i })).toBeInTheDocument();
  });

  it("exposes the thread as a log for assistive technology", () => {
    render(<ChatMessageList messages={[message(1, "visitor", "2026-03-12T09:00:00.000Z")]} />);

    const log = screen.getByRole("log");
    expect(within(log).getByText("Message 1")).toBeInTheDocument();
  });
});
