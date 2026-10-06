import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MobileNav } from "@/components/marketing/mobile-nav";
import { NAV_LINKS } from "@/components/marketing/nav-links";

/**
 * The header's mobile navigation under jsdom.
 *
 * `MobileNav` is a client component reaching nothing `server-only`, so it mounts
 * here for real. It is rendered on its own rather than through `SiteHeader`
 * because the panel's positioning depends on CSS that jsdom does not compute —
 * the class assertions below are the only net under that, and they are the
 * reason this file asserts raw `className` strings at all.
 *
 * Links are asserted by `href` and never clicked: next/link outside a router
 * context throws on navigation. The close-on-tap path is therefore exercised
 * through the Request Quote CTA, which is a plain `<a>` (brand-cta.tsx) and
 * carries the same handler.
 */

const TOGGLE = { name: "Open navigation menu" };

async function open() {
  render(<MobileNav />);
  const toggle = screen.getByRole("button", TOGGLE);
  await userEvent.click(toggle);
  return { toggle, panel: screen.getByRole("navigation", { name: "Mobile" }) };
}

describe("the toggle", () => {
  it("starts closed, with no panel in the document", () => {
    render(<MobileNav />);

    expect(screen.getByRole("button", TOGGLE)).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("is a 44px labelled touch target that never relies on the icon alone", () => {
    render(<MobileNav />);
    const toggle = screen.getByRole("button", TOGGLE);

    expect(toggle.className).toContain("size-11");
    // The label flips with state, so a screen reader is told what the press will
    // do rather than having to infer it from a hamburger glyph.
    expect(toggle.className).toContain("lg:hidden");
  });

  it("points at the panel it controls", async () => {
    const { toggle, panel } = await open();

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // useId() values contain «», so compare attributes rather than build a
    // selector from them.
    expect(panel.id).toBe(toggle.getAttribute("aria-controls"));
  });

  it("relabels itself once open, so the X is not the only cue", async () => {
    await open();

    expect(screen.getByRole("button", { name: "Close navigation menu" })).toBeInTheDocument();
    expect(screen.queryByRole("button", TOGGLE)).toBeNull();
  });
});

describe("the panel", () => {
  it("reaches every destination the desktop nav has", async () => {
    const { panel } = await open();
    const hrefs = [...panel.querySelectorAll("a")].map((link) => link.getAttribute("href"));

    // Parity with the desktop nav is the whole point of gap 20: hiding a
    // destination on mobile would just move the problem.
    for (const link of NAV_LINKS) {
      expect(hrefs).toContain(link.href);
    }
    expect(hrefs).toContain("/track");
    expect(hrefs).toContain("/about");
    expect(hrefs).toContain("/contact");
  });

  it("promotes the tracking lookup as its one CTA, pointed at a real route", async () => {
    const { panel } = await open();
    const cta = screen.getByRole("link", { name: "Track code" });

    // /track, never /tracking — the latter is not a route. Nothing in the
    // toolchain checks an href (typedRoutes is off), so this assertion is the
    // only net under it.
    expect(cta).toHaveAttribute("href", "/track");
    expect(cta.className).toContain("w-full");
    expect(panel.contains(cta)).toBe(true);
  });

  it("offers no Request Quote, which is inert and lives in the header only", async () => {
    await open();

    // Deliberate: `href="#"` goes nowhere, so duplicating it here would add a
    // dead control to the one menu a phone user has.
    expect(screen.queryByRole("link", { name: "Request Quote" })).toBeNull();
  });

  it("anchors to the header's own bottom edge, not a hardcoded offset", async () => {
    const { panel } = await open();

    // REGRESSION GUARD. The primary bar is `backdrop-blur-md`, and a
    // backdrop-filter other than `none` makes an element the containing block
    // for its fixed AND absolute descendants. `fixed … top-header` here would
    // resolve against the 80px bar, not the viewport, dropping the panel 40px
    // below the header — and a `fixed inset-0` backdrop would compute a negative
    // height and vanish, silently taking click-to-close with it.
    expect(panel.className).toContain("absolute");
    expect(panel.className).toContain("top-full");
    expect(panel.className).not.toContain("fixed");
    expect(panel.className).not.toContain("top-header");
  });

  it("measures its height cap in dvh and never in vh", async () => {
    const { panel } = await open();

    expect(panel.className).toContain("100dvh");
    // vh does not shrink for mobile browser chrome, so the CTA at the bottom of
    // the panel would sit under the URL bar.
    expect(panel.className).not.toMatch(/\d+vh/);
  });

  it("scrolls inside itself rather than growing past the viewport", async () => {
    const { panel } = await open();

    expect(panel.className).toContain("overflow-y-auto");
    // Without this, scrolling to the end of the panel chains into the page
    // behind it.
    expect(panel.className).toContain("overscroll-contain");
  });

  it("is full-bleed with no unprefixed width or height", async () => {
    const { panel } = await open();

    // Responsive rule 1 read literally: the unprefixed classes ARE the mobile
    // layout. This is what stops it regressing to a fixed-width box that
    // overflows 320px.
    expect(panel.className).toContain("inset-x-0");
    expect(panel.className).not.toMatch(/(?:^|\s)[wh]-\[/);
  });

  it("claims no z-index, because the header is already a stacking context", async () => {
    const { panel } = await open();

    // `<header>` is `fixed … z-50`, so the whole subtree paints as one unit at
    // 50 and a z-index in here could not be ordered against the chat launcher's
    // z-40 or the skip link's focus:z-[60] anyway. Rule 7: no dead config.
    expect(panel.className).not.toMatch(/z-/);
  });

  it("is a disclosure and claims nothing it does not implement", async () => {
    const { panel } = await open();

    // Not a dialog: no role, and therefore no aria-modal to be dishonest about
    // and no focus trap owed. Pins the decision so it is not later "fixed" into
    // a half-dialog with a role but still no trap.
    expect(panel.tagName).toBe("NAV");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(panel).not.toHaveAttribute("aria-modal");
  });

  it("animates only when the viewer has not asked for less motion", async () => {
    const { panel } = await open();

    expect(panel.className).toContain("motion-safe:animate-in");
    expect(panel.className).not.toMatch(/(?:^|\s)animate-in/);
  });
});

describe("closing", () => {
  it("closes on Escape and hands focus back to the toggle", async () => {
    const { toggle } = await open();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("navigation")).toBeNull();
    // Focus must never be dropped on the body.
    expect(toggle).toHaveFocus();
  });

  it("closes when the backdrop is tapped, and returns focus", async () => {
    const { toggle, panel } = await open();
    const backdrop = panel.previousElementSibling;

    expect(backdrop).not.toBeNull();
    // aria-hidden, because Escape and the rows already close the panel — it adds
    // no keyboard affordance and should not be announced.
    expect(backdrop).toHaveAttribute("aria-hidden", "true");

    await userEvent.click(backdrop as Element);

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(toggle).toHaveFocus();
  });

  it("closes when a destination is tapped, so the panel does not cover the next page", async () => {
    await open();

    // Services stands in for the rest of the rows: it is the one whose href is
    // "#", so it renders as a plain <a> and is safe to click. next/link throws
    // outside a router context, and jsdom cannot navigate to "/track" either —
    // every row carries the same handler regardless.
    //
    // An onClick rather than an effect on usePathname(), which would both trip
    // react-hooks/set-state-in-effect and miss a tap on the CURRENT route, where
    // Next performs no navigation and so fires no pathname change at all.
    await userEvent.click(screen.getByRole("link", { name: "Services" }));

    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
