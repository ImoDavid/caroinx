import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ServicesPage from "@/app/(public)/services/page";
import { NAV_LINKS } from "@/components/marketing/nav-links";
import { SERVICE_DIVISIONS } from "@/components/marketing/service-divisions";
import { ServicesGrid } from "@/components/marketing/services-grid";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { TRANSPORT_TYPE_LABELS, TRANSPORT_TYPES } from "@/validations/shipment";

/**
 * The services page is a plain synchronous Server Component that reads no
 * request APIs and imports nothing reaching `server-only` — so the `dom`
 * project, which has no `react-server` resolve condition, renders it whole.
 * That is also exactly what keeps it prerendering as `○`.
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

function hrefsOf(container: HTMLElement): string[] {
  return [...container.querySelectorAll("a")].map((link) => link.getAttribute("href") ?? "");
}

/** The fragment of every `/services#…` link, e.g. "air-freight". */
function serviceAnchors(container: HTMLElement): string[] {
  return hrefsOf(container)
    .filter((href) => href.startsWith("/services#"))
    .map((href) => href.slice("/services#".length));
}

describe("ServicesPage", () => {
  it("renders exactly one h1, because the topbar-free public pages own their title", () => {
    const { container } = render(<ServicesPage />);

    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("points every section's aria-labelledby at a heading that exists", () => {
    // A copy-pasted id is the likeliest defect in a page assembled from five
    // sections, and it silently removes the section from the a11y tree.
    const { container } = render(<ServicesPage />);

    expect(danglingSectionLabels(container)).toEqual([]);
  });

  it("names every division, reading them from the shared list rather than as copy", () => {
    render(<ServicesPage />);

    for (const division of SERVICE_DIVISIONS) {
      expect(screen.getByText(division.title)).toBeInTheDocument();
    }
  });

  it("gives every division slug a real anchor on the page", () => {
    // The landing grid and the footer both deep-link to these. typedRoutes is
    // off, so a renamed slug would typecheck, build, and land on the page top.
    const { container } = render(<ServicesPage />);

    for (const division of SERVICE_DIVISIONS) {
      expect(container.querySelector(`#${division.slug}`)).not.toBeNull();
    }
  });

  it("names every transport mode from TRANSPORT_TYPE_LABELS, so it cannot drift from /track", () => {
    render(<ServicesPage />);

    for (const mode of TRANSPORT_TYPES) {
      expect(screen.getByText(TRANSPORT_TYPE_LABELS[mode])).toBeInTheDocument();
    }
  });

  it("opens the chat rather than handing out an email address", () => {
    const { container } = render(<ServicesPage />);

    expect(
      screen.getByRole("button", { name: /talk to the operations desk/i }),
    ).toBeInTheDocument();
    // The only mailto is inside ChatCta's <noscript> fallback, which React's
    // client renderer leaves empty (rule 57) — so with scripting on, nothing
    // here offers an address as the primary route.
    expect(hrefsOf(container).filter((href) => href.startsWith("mailto:"))).toEqual([]);
  });
});

describe("links into /services", () => {
  /**
   * The highest-value assertions in this file. `typedRoutes` is NOT enabled, so
   * nothing in the toolchain checks any href — a bad anchor typechecks, builds,
   * and silently lands the visitor on the page top.
   */
  const anchors = (() => {
    const { container } = render(<ServicesPage />);
    return [...container.querySelectorAll("[id]")].map((node) => node.id);
  })();

  it("resolves every footer Solutions anchor to a section that exists", () => {
    const { container } = render(<SiteFooter />);
    const used = serviceAnchors(container);

    expect(used.length).toBeGreaterThan(0);
    for (const anchor of used) {
      expect(anchors).toContain(anchor);
    }
  });

  it("resolves every landing-grid anchor to a section that exists", () => {
    const { container } = render(<ServicesGrid />);
    const used = serviceAnchors(container);

    // One per division — the "Learn More" links.
    expect(used).toHaveLength(SERVICE_DIVISIONS.length);
    for (const anchor of used) {
      expect(anchors).toContain(anchor);
    }
  });

  it("sends the landing grid's overview link to the page itself", () => {
    const { container } = render(<ServicesGrid />);

    expect(hrefsOf(container)).toContain("/services");
  });

  it("reaches /services from the header nav", () => {
    const { container } = render(<SiteHeader />);

    expect(hrefsOf(container)).toContain("/services");
  });

  it("leaves no inert placeholder in the primary nav", () => {
    // Services was the last NAV_LINKS entry pointing at "#" (CLAUDE.md gap 20).
    for (const link of NAV_LINKS) {
      expect(link.href).not.toBe("#");
    }
  });
});
