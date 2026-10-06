import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RouteMap } from "@/components/marketing/tracking/route-map";
import { TrackForm } from "@/components/marketing/tracking/track-form";
import type { TrackingParty } from "@/types/tracking";

/**
 * Both components are Server Components, but neither reaches `server-only` —
 * they import only client-safe data modules — so the `dom` project, which has no
 * `react-server` resolve condition, can render them.
 */

function party(overrides: Partial<TrackingParty> = {}): TrackingParty {
  return { name: "Ada Freight", country: "NG", location: "Lagos", ...overrides };
}

describe("TrackForm", () => {
  it("is a plain GET form to /track, so it works without JavaScript", () => {
    const { container } = render(<TrackForm idPrefix="test" variant="page" />);
    const form = container.querySelector("form");

    // A Server Action or an onSubmit handler here would silently break the
    // no-JavaScript path that the whole tracking design rests on.
    expect(form?.getAttribute("action")).toBe("/track");
    expect(form?.getAttribute("method")).toBe("get");
  });

  it("names the input `code`, which is what the page reads back", () => {
    render(<TrackForm idPrefix="test" variant="page" />);

    expect(screen.getByRole("textbox", { name: "Tracking code" })).toHaveAttribute("name", "code");
  });

  it("gives the label and input matching ids, per instance", () => {
    // The form renders more than once per page (hero console and /track). Without
    // the prefix both labels would point at the first input on the page.
    const { container } = render(
      <>
        <TrackForm idPrefix="console" variant="console" />
        <TrackForm idPrefix="page" variant="page" />
      </>,
    );

    const ids = [...container.querySelectorAll("input")].map((input) => input.id);
    expect(ids).toEqual(["console-track-code", "page-track-code"]);

    for (const label of container.querySelectorAll("label")) {
      expect(ids).toContain(label.getAttribute("for"));
    }
  });

  it("pre-fills the searched code so a correction does not mean retyping", () => {
    render(<TrackForm idPrefix="test" variant="page" defaultValue="TGR-8F3K2QD7" />);

    expect(screen.getByRole("textbox", { name: "Tracking code" })).toHaveValue("TGR-8F3K2QD7");
  });
});

describe("RouteMap", () => {
  function pins(container: HTMLElement): number {
    return container.querySelectorAll("circle").length;
  }

  function arcs(container: HTMLElement): number {
    return container.querySelectorAll("path[stroke-dasharray]").length;
  }

  it("draws two pins and an arc for an international route", () => {
    const { container } = render(
      <RouteMap sender={party()} receiver={party({ country: "GH", location: "Accra" })} />,
    );

    expect(pins(container)).toBe(2);
    expect(arcs(container)).toBe(1);
    expect(screen.getAllByText(/Nigeria/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ghana/).length).toBeGreaterThan(0);
  });

  it("draws a second arc copy only when the route crosses the antimeridian", () => {
    const { container } = render(
      <RouteMap
        sender={party({ country: "NZ", location: "Auckland" })}
        receiver={party({ country: "US", location: "Los Angeles" })}
      />,
    );

    // One real arc plus its wrapped duplicate, so the line leaves one edge and
    // reappears at the other instead of crossing Africa.
    expect(arcs(container)).toBe(2);
  });

  it("shows one pin and no arc when both ends are the same country", () => {
    const { container } = render(
      <RouteMap sender={party()} receiver={party({ location: "Kano" })} />,
    );

    expect(pins(container)).toBe(1);
    expect(arcs(container)).toBe(0);
    expect(screen.getByText(/Domestic route/)).toBeInTheDocument();
  });

  it("shows one pin and says so when only one country was recorded", () => {
    const { container } = render(
      <RouteMap sender={party()} receiver={party({ country: undefined })} />,
    );

    expect(pins(container)).toBe(1);
    expect(arcs(container)).toBe(0);
    expect(screen.getByText(/destination country was not recorded/)).toBeInTheDocument();
  });

  it("renders nothing at all when neither country was recorded", () => {
    // A blank navy rectangle with no pins is worse than no map. Pre-country
    // shipments hit this.
    const { container } = render(
      <RouteMap sender={party({ country: undefined })} receiver={party({ country: undefined })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
