import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConversationList } from "@/components/admin/conversation-list";
import { ConversationMeta } from "@/components/admin/conversation-meta";
import type { ConversationDetail, ConversationSummary } from "@/types/chat";

/**
 * The inbox's two read-only surfaces.
 *
 * Both are Server Components but reach nothing `server-only` — they are
 * prop-driven precisely so the `dom` project can mount them, which is what makes
 * everything the inbox page RENDERS testable even though the page itself (an
 * async Server Component reaching `requireAdmin`) cannot be.
 *
 * Links are asserted by `href` and never clicked: next/link outside a router
 * context throws on navigation.
 */

function summary(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: "65b000000000000000000001",
    visitorName: "Ada Okafor",
    status: "open",
    lastMessageAt: "2026-03-12T09:05:00.000Z",
    lastMessageFrom: "visitor",
    lastMessagePreview: "Where is my parcel?",
    unread: 0,
    messageCount: 3,
    ...overrides,
  };
}

function detail(overrides: Partial<ConversationDetail> = {}): ConversationDetail {
  return {
    ...summary(),
    startedAt: "2026-03-12T09:00:00.000Z",
    lastSeq: 3,
    ...overrides,
  };
}

describe("ConversationList", () => {
  it("links every row to its own conversation", () => {
    render(<ConversationList conversations={[summary()]} filtered={false} />);

    expect(screen.getByRole("link", { name: /Ada Okafor/ })).toHaveAttribute(
      "href",
      "/admin/inbox/65b000000000000000000001",
    );
  });

  it("exposes the unread count as text, not by colour alone", () => {
    render(<ConversationList conversations={[summary({ unread: 2 })]} filtered={false} />);

    // A coloured dot would leave this invisible to a screen reader and to anyone
    // who cannot distinguish the badge from the card.
    expect(screen.getByText(/2 unread/)).toBeInTheDocument();
  });

  it("renders no unread badge at zero rather than a '0'", () => {
    render(<ConversationList conversations={[summary({ unread: 0 })]} filtered={false} />);
    expect(screen.queryByText(/unread/)).toBeNull();
  });

  it("gives each row a comfortable touch target", () => {
    render(<ConversationList conversations={[summary()]} filtered={false} />);
    expect(screen.getByRole("link", { name: /Ada Okafor/ }).className).toContain("min-h-11");
  });

  it("marks who sent the last message, so the admin can see what needs a reply", () => {
    render(
      <ConversationList
        conversations={[summary({ lastMessageFrom: "admin", lastMessagePreview: "On its way" })]}
        filtered={false}
      />,
    );

    expect(screen.getByText("You:")).toBeInTheDocument();
  });

  it("says so explicitly when a conversation has no messages", () => {
    // A visitor can open a conversation and abandon it before writing; a blank
    // row would read as a rendering bug.
    render(
      <ConversationList
        conversations={[summary({ lastMessagePreview: undefined, lastMessageFrom: undefined })]}
        filtered={false}
      />,
    );

    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("shows the linked tracking code when one resolved", () => {
    render(
      <ConversationList
        conversations={[summary({ trackingCode: "TGR-8F3K2QD7" })]}
        filtered={false}
      />,
    );

    expect(screen.getByText("TGR-8F3K2QD7")).toBeInTheDocument();
  });

  it("gives a different empty state when filters are the reason", () => {
    const { rerender } = render(<ConversationList conversations={[]} filtered={false} />);
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();

    rerender(<ConversationList conversations={[]} filtered />);
    expect(screen.getByText("No conversations match those filters")).toBeInTheDocument();
  });

  it("wraps its metadata row rather than letting it overflow a phone", () => {
    const { container } = render(<ConversationList conversations={[summary()]} filtered={false} />);
    // Responsive rule 2: a row of chips and stats must wrap, never scroll the
    // page sideways. The cargo table's horizontal scroll is the thing avoided.
    expect(container.querySelector(".flex-wrap")).not.toBeNull();
  });
});

describe("ConversationMeta", () => {
  it("reads 'Not recorded' for every field the headers did not supply", () => {
    // None of the x-vercel-* headers exist under `next dev`, so locally this is
    // almost the whole card — and that is the honest answer, not a bug.
    render(<ConversationMeta conversation={detail()} />);

    expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(3);
  });

  it("never offers an IP row, because an IP is never collected", () => {
    render(<ConversationMeta conversation={detail({ meta: { country: "NG", city: "Lagos" } })} />);

    expect(screen.queryByText(/IP/)).toBeNull();
    expect(screen.getByText("Lagos")).toBeInTheDocument();
  });

  it("makes the visitor's email a mailto, since there is no email transport", () => {
    render(<ConversationMeta conversation={detail({ visitorEmail: "ada@example.com" })} />);

    expect(screen.getByRole("link", { name: "ada@example.com" })).toHaveAttribute(
      "href",
      "mailto:ada@example.com",
    );
  });

  it("shows a tracking code that did NOT resolve, so a typo is visible", () => {
    render(<ConversationMeta conversation={detail({ trackingCodeAttempted: "TGR-ZZZZZZZZ" })} />);

    expect(screen.getByText("TGR-ZZZZZZZZ")).toBeInTheDocument();
    expect(screen.getByText("(no match)")).toBeInTheDocument();
  });

  it("omits the 'code tried' row entirely when there was nothing to try", () => {
    render(<ConversationMeta conversation={detail()} />);
    expect(screen.queryByText("Code tried")).toBeNull();
  });
});
