import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import AboutPage from "@/app/(public)/about/page";
import ContactPage from "@/app/(public)/contact/page";
import { BRAND } from "@/components/marketing/brand";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * Both pages are Server Components, but they are plain synchronous functions
 * that read no request APIs and import nothing reaching `server-only` — so the
 * `dom` project, which has no `react-server` resolve condition, renders them
 * whole. Rendering the page rather than each section is the point: it is the
 * only level at which the heading outline and the section wiring are real.
 *
 * Links are asserted by `href` and never clicked — next/link outside a router
 * context throws on navigation.
 */

/** Every `<section aria-labelledby>` must point at an id that exists in the DOM. */
function danglingSectionLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll("section[aria-labelledby]")]
    .map((section) => section.getAttribute("aria-labelledby") ?? "")
    .filter((id) => container.querySelector(`#${id}`) === null);
}

describe("AboutPage", () => {
  it("renders exactly one h1, because the topbar-free public pages own their title", () => {
    const { container } = render(<AboutPage />);

    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("points every section's aria-labelledby at a heading that exists", () => {
    // A copy-pasted id is the likeliest defect in a page assembled from five
    // sections, and it silently removes the section from the a11y tree.
    const { container } = render(<AboutPage />);

    expect(danglingSectionLabels(container)).toEqual([]);
  });

  it("states the real tracking-code prefix, so the page cannot drift from /track", () => {
    render(<AboutPage />);

    // Read from TRACKING_CODE_PREFIX rather than typed as copy — if the format
    // ever changes, this section changes with it.
    expect(screen.getByText(/TGR-/)).toBeInTheDocument();
  });
});

describe("ContactPage", () => {
  it("renders no form, because the app has no email transport to post one to", () => {
    // The single most valuable assertion here: a form is exactly the thing a
    // future contributor would add helpfully, and it would have nowhere to go.
    const { container } = render(<ContactPage />);

    expect(container.querySelector("form")).toBeNull();
  });

  it("addresses every mailto to a brand mailbox, so no hand-typed address drifts", () => {
    const { container } = render(<ContactPage />);
    const addresses = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]')].map(
      (link) =>
        link
          .getAttribute("href")
          ?.replace(/^mailto:/, "")
          .split("?")[0],
    );

    expect(addresses.length).toBeGreaterThan(0);
    for (const address of addresses) {
      expect([BRAND.supportEmail, BRAND.dispatchEmail]).toContain(address);
    }
  });

  it("percent-encodes the subject prefill, because a raw space or a + breaks it", () => {
    // URLSearchParams would encode a space as "+", which is a LITERAL plus in a
    // mailto query — the subject would arrive reading "Dispatch+enquiry".
    const { container } = render(<ContactPage />);
    const queries = [...container.querySelectorAll<HTMLAnchorElement>('a[href*="?subject="]')].map(
      (link) => link.getAttribute("href") ?? "",
    );

    expect(queries.length).toBeGreaterThan(0);
    for (const href of queries) {
      const subject = href.split("?subject=")[1] ?? "";
      expect(subject).not.toContain(" ");
      expect(subject).not.toContain("+");
      expect(subject).toContain("%20");
    }
  });

  it("points every section's aria-labelledby at a heading that exists", () => {
    const { container } = render(<ContactPage />);

    expect(danglingSectionLabels(container)).toEqual([]);
  });

  it("offers /track, because 'where is my shipment' needs no email", () => {
    const { container } = render(<ContactPage />);
    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/track");
  });
});

describe("site chrome", () => {
  // `typedRoutes` is NOT enabled (it is absent from next.config.ts, and
  // next/link declares `href: Url` = `string | UrlObject`), so nothing in the
  // toolchain checks ANY href in this project — a typo would typecheck, build
  // and 404. These assertions are the only net under every link, not just the
  // plain <a> ones in BrandCta and ArrowLink.
  it("reaches /about and /contact from the header nav", () => {
    const { container } = render(<SiteHeader />);
    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/about");
    expect(hrefs).toContain("/contact");
  });

  it("offers a real mobile menu rather than a placeholder button", async () => {
    // Gap 20's placeholder had no handler, no panel and no aria-expanded. This
    // is the assertion that pins it as really gone; MobileNav's own behaviour is
    // covered in tests/components/mobile-nav.test.tsx.
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Open navigation menu" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls");

    await userEvent.click(toggle);

    const hrefs = [...screen.getByRole("navigation", { name: "Mobile" }).querySelectorAll("a")].map(
      (link) => link.getAttribute("href"),
    );
    expect(hrefs).toContain("/about");
    expect(hrefs).toContain("/contact");
  });

  it("still reaches both pages from the footer, which needs no JavaScript", () => {
    // No longer the ONLY path below lg — MobileNav closed that gap — but still
    // the one that works with scripting off, which is why FooterLink carries
    // `{ label, href }` at all.
    const { container } = render(<SiteFooter />);
    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/about");
    expect(hrefs).toContain("/contact");
  });
});
