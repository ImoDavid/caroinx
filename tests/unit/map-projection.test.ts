import { describe, expect, it } from "vitest";

import {
  MAP_HEIGHT,
  MAP_WIDTH,
  arcPath,
  project,
  projectPercent,
  routeGeometry,
} from "@/lib/map-projection";

/**
 * Reads "M ax ay Q cx cy bx by" back into its seven numbers.
 *
 * Returned as a named tuple rather than an array so the assertions below are
 * readable and index access stays sound under noUncheckedIndexedAccess.
 */
function parseArc(path: string): {
  ax: number;
  ay: number;
  cx: number;
  cy: number;
  bx: number;
  by: number;
} {
  const parts = (path.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  expect(parts, `unexpected arc path: ${path}`).toHaveLength(6);
  const [ax = 0, ay = 0, cx = 0, cy = 0, bx = 0, by = 0] = parts;
  return { ax, ay, cx, cy, bx, by };
}

describe("project", () => {
  it("maps the three corners and the origin exactly", () => {
    expect(project({ lat: 0, lng: 0 })).toEqual({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
    expect(project({ lat: 90, lng: -180 })).toEqual({ x: 0, y: 0 });
    expect(project({ lat: -90, lng: 180 })).toEqual({ x: MAP_WIDTH, y: MAP_HEIGHT });
  });

  it("puts east of the meridian right of centre and north above it", () => {
    const lagos = project({ lat: 6.5, lng: 3.4 });
    expect(lagos.x).toBeGreaterThan(MAP_WIDTH / 2);
    expect(lagos.y).toBeLessThan(MAP_HEIGHT / 2);
  });
});

describe("projectPercent", () => {
  it("returns the centre as 50/50", () => {
    expect(projectPercent({ lat: 0, lng: 0 })).toEqual({ left: 50, top: 50 });
  });
});

describe("arcPath", () => {
  it("bows the control point above the chord", () => {
    const { ax, ay, cx, cy, bx, by } = parseArc(arcPath({ x: 100, y: 300 }, { x: 500, y: 300 }));

    expect([ax, ay]).toEqual([100, 300]);
    expect([bx, by]).toEqual([500, 300]);
    // Midpoint horizontally, lifted vertically (smaller y is higher on screen).
    expect(cx).toBe(300);
    expect(cy).toBeLessThan(300);
  });

  it("lifts the visible apex by the intended fraction, not half of it", () => {
    // A quadratic Bézier's apex is at t=0.5, which is HALF WAY between the
    // midpoint and the control point. This is the check that the control point
    // compensates — get it wrong and every arc renders half as tall as intended.
    const { ay, cy, by } = parseArc(arcPath({ x: 0, y: 250 }, { x: 400, y: 250 }));
    const apexY = (ay + 2 * cy + by) / 4;
    const chord = 400;

    expect(250 - apexY).toBeCloseTo(chord * 0.18, 1);
  });

  it("keeps the apex inside the box on a full-width route", () => {
    const { cy } = parseArc(arcPath({ x: 0, y: 250 }, { x: MAP_WIDTH, y: 250 }));
    expect(cy).toBeGreaterThanOrEqual(0);
  });
});

describe("routeGeometry", () => {
  const nz = { lat: -39.8, lng: 172.8 };
  const us = { lat: 39.5, lng: -97.5 };
  const ng = { lat: 9.4, lng: 7.5 };
  const gb = { lat: 54.4, lng: -2.1 };

  it("does not wrap a route that stays within half the globe", () => {
    const route = routeGeometry(ng, gb);
    expect(route.wrapShift).toBe(0);
  });

  it("takes the short way across the Pacific rather than across Africa", () => {
    // NZ to the US is 68 degrees apart eastward and 292 the other way. A naive
    // line between the projected points draws the 292 version — straight across
    // Africa — so this is the check that matters.
    const route = routeGeometry(nz, us);

    expect(route.wrapShift).not.toBe(0);

    const { ax, cx } = parseArc(route.path);
    // The arc leaves NZ heading EAST, off the right-hand edge.
    expect(cx).toBeGreaterThan(ax);
    expect(cx).toBeGreaterThan(MAP_WIDTH);
    // ...so its duplicate belongs one width to the WEST.
    expect(route.wrapShift).toBe(-MAP_WIDTH);
  });

  it("pins at the true longitude even when the arc uses the extended one", () => {
    const route = routeGeometry(nz, us);
    // The pin must sit over Kansas, not off the right-hand edge of the map.
    expect(route.to).toEqual(project(us));
    expect(route.to.x).toBeLessThan(MAP_WIDTH / 2);
  });

  it("is symmetric about which end wraps", () => {
    const route = routeGeometry(us, nz);
    expect(route.wrapShift).toBe(MAP_WIDTH);
    expect(route.from).toEqual(project(us));
    expect(route.to).toEqual(project(nz));
  });
});
