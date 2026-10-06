import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatMount } from "@/components/marketing/chat/chat-mount";
import { BRAND } from "@/components/marketing/brand";

/**
 * The public chat widget under jsdom.
 *
 * `ChatMount` is a Server Component but reaches nothing `server-only` — it reads
 * NOTHING by design, which is exactly what keeps `/`, `/about` and `/contact`
 * statically prerendered — so the `dom` project, which has no `react-server`
 * resolve condition, can render it. The client island below it is a client
 * component, so it mounts here for real.
 *
 * No `fetch` stub is needed: with no conversation the poll is disabled, so an
 * unopened widget makes no request at all. That is itself the property being
 * relied on.
 *
 * Deliberately NOT covered here: polling cadence. Every scheduling decision
 * lives in `nextPollDelay` and is covered in `tests/unit/chat-poll-schedule.ts`
 * — see rule 43 for why a timer test here would assert the mock, not the hook.
 */

describe("ChatMount", () => {
  /**
   * The no-JS fallback has to be asserted against SERVER markup.
   *
   * React's client renderer emits a literally empty `<noscript></noscript>` —
   * its children are serialised only during SSR — so `render()` can never see
   * the fallback, and a test that queried the DOM for it would pass while
   * asserting nothing. This renders the same tree the way the browser first
   * receives it.
   */
  const markup = () => renderToStaticMarkup(<ChatMount />);

  it("offers an email fallback with no JavaScript, because there is no no-JS chat", () => {
    expect(markup()).toContain(`mailto:${BRAND.supportEmail}`);
  });

  it("percent-encodes the mailto subject, never plus-encodes it", () => {
    // Gap 19 already paid for this lesson: a `+` in a mailto query is a literal
    // plus, so URLSearchParams would deliver "Support+enquiry".
    expect(markup()).toContain("subject=Support%20enquiry");
    expect(markup()).not.toContain("subject=Support+enquiry");
  });

  it("puts the fallback inside <noscript>, so it never shows alongside the widget", () => {
    expect(markup()).toMatch(/<noscript>.*mailto:.*<\/noscript>/s);
  });

  it("drops itself from printed pages, like the rest of the site chrome", () => {
    const { container } = render(<ChatMount />);
    expect(container.querySelector('[data-print="hide"]')).not.toBeNull();
  });
});

describe("the launcher", () => {
  it("is a labelled, comfortably sized touch target", () => {
    render(<ChatMount />);
    const launcher = screen.getByRole("button", { name: "Open chat" });

    expect(launcher).toHaveAttribute("aria-expanded", "false");
    // 56px: above the 44px floor, because this floats over content.
    expect(launcher.className).toContain("min-h-14");
    expect(launcher.className).toContain("min-w-14");
  });

  it("sits under the header rather than over its menus", () => {
    render(<ChatMount />);
    // The header is fixed z-50; a launcher above it could cover its own nav.
    expect(screen.getByRole("button", { name: "Open chat" }).className).toContain("z-40");
  });

  it("lifts clear of mobile browser chrome, or it cannot be tapped at all", () => {
    // Regression: `position: fixed` is laid out against the LARGE viewport, so
    // iOS Safari's bottom toolbar paints over anything at `bottom: 12px` and
    // swallows the tap — the button looks fine and does nothing.
    // `100lvh - 100dvh` is the height of whatever chrome is showing, and zero
    // when it is retracted.
    render(<ChatMount />);
    const launcher = screen.getByRole("button", { name: "Open chat" });

    expect(launcher.className).toContain("max-sm:bottom-[calc(100lvh-100dvh+0.75rem)]");
    // Still a plain offset on desktop, and kept as a separate declaration so a
    // browser without lvh/dvh falls back to it rather than losing `bottom`.
    expect(launcher.className).toContain("bottom-3");
  });

  it("points at the panel it controls", async () => {
    render(<ChatMount />);
    const launcher = screen.getByRole("button", { name: "Open chat" });

    await userEvent.click(launcher);

    expect(launcher).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog").id).toBe(launcher.getAttribute("aria-controls"));
  });
});

describe("the panel", () => {
  async function openPanel() {
    render(<ChatMount />);
    await userEvent.click(screen.getByRole("button", { name: "Open chat" }));
    return screen.getByRole("dialog");
  }

  it("is a full-bleed sheet on a phone and only a card from sm upwards", async () => {
    const dialog = await openPanel();

    // Responsive rule 1, read literally: the unprefixed classes ARE the mobile
    // layout, and `sm:` only adds to them. This is what stops it regressing to
    // a fixed 400px box that overflows a 320px screen.
    expect(dialog.className).toContain("inset-x-2");
    expect(dialog.className).toContain("sm:w-[min(23rem,calc(100vw-1.5rem))]");
    // No unprefixed width or height at all.
    expect(dialog.className).not.toMatch(/(?:^|\s)[wh]-\[/);
  });

  it("measures its height in dvh, so the composer clears the mobile URL bar", async () => {
    const dialog = await openPanel();
    expect(dialog.className).toContain("100dvh");
  });

  it("lifts its own bottom edge clear of mobile browser chrome", async () => {
    // Otherwise the composer — the whole point of the panel — sits under the
    // toolbar on a phone. Same correction as the launcher.
    const dialog = await openPanel();
    expect(dialog.className).toContain("max-sm:bottom-[calc(100lvh-100dvh+0.5rem)]");
  });

  it("stays below the skip link while covering the header", async () => {
    const dialog = await openPanel();
    // Above the z-50 header (it covers the page on a phone), below the skip
    // link's focus:z-[60], which must always be reachable.
    expect(dialog.className).toContain("z-[55]");
  });

  it("is a non-modal dialog, with no focus trap claimed", async () => {
    const dialog = await openPanel();
    // Honest about what it is: a real trap needs ui/dialog.tsx, which is absent.
    // Escape closes and returns focus, and Tab still reaches the page behind.
    expect(dialog).not.toHaveAttribute("aria-modal");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("closes on Escape and hands focus back to the launcher", async () => {
    render(<ChatMount />);
    const launcher = screen.getByRole("button", { name: "Open chat" });
    await userEvent.click(launcher);

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(launcher).toHaveFocus();
  });
});

describe("the pre-chat form", () => {
  async function openForm() {
    render(<ChatMount />);
    await userEvent.click(screen.getByRole("button", { name: "Open chat" }));
  }

  it("requires a name and nothing else", async () => {
    await openForm();

    expect(screen.getByLabelText("Your name")).toBeRequired();
    expect(screen.getByLabelText(/^Email/)).not.toBeRequired();
    expect(screen.getByLabelText(/^Tracking code/)).not.toBeRequired();
  });

  it("says 'optional' in the label rather than leaving it to be inferred", async () => {
    await openForm();

    // Queried BY the accessible name, so the word is really in the label the
    // field is associated with — not merely somewhere nearby on screen.
    expect(screen.getByLabelText("Email (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Tracking code (optional)")).toBeInTheDocument();
  });

  it("cannot be submitted until a name is typed", async () => {
    await openForm();
    const submit = screen.getByRole("button", { name: "Start chat" });

    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Your name"), "Ada");
    expect(submit).toBeEnabled();
  });

  it("promises a response time rather than faking a presence dot", async () => {
    await openForm();
    // Presence is per-conversation, so before one exists there is nothing
    // truthful to show — the same instinct as the admin bell refusing a
    // fabricated count.
    expect(screen.getByText(/pick this up as soon as we can/i)).toBeInTheDocument();
  });

  it("shows no composer until a conversation exists", async () => {
    await openForm();
    expect(screen.queryByLabelText("Your message")).toBeNull();
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
  });
});
