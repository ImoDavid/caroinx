/**
 * Equirectangular (plate carrée) projection onto a 1000×500 box, plus the
 * geometry of the route arc drawn between two countries.
 *
 * Chosen over anything prettier because it is two multiplications and is
 * invertible in one line — which is what lets `scripts/generate-world-map.ts`
 * project the coastline through THIS function. The committed SVG and the pins
 * drawn over it therefore share one coordinate system by construction rather
 * than by agreement: change MAP_WIDTH/MAP_HEIGHT and the map must be
 * regenerated.
 *
 * Client-safe: plain arithmetic, no dependencies, no environment access.
 */

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;

export type Coordinates = { lat: number; lng: number };
export type Point = { x: number; y: number };

export function project({ lat, lng }: Coordinates): Point {
  return {
    x: ((lng + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

/**
 * The same position as CSS percentages, for the HTML flag chips laid over the
 * map — an SVG `<text>` neither wraps nor inherits Tailwind.
 */
export function projectPercent(coordinates: Coordinates): { left: number; top: number } {
  const { x, y } = project(coordinates);
  return { left: (x / MAP_WIDTH) * 100, top: (y / MAP_HEIGHT) * 100 };
}

/** One decimal place is well under a pixel at this scale and halves the path. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Apex lift as a fraction of the chord. Reads as a flight path without
 *  leaving the box on a long route. */
const ARC_APEX_RATIO = 0.18;

/** Keeps the apex off the very top edge on a long east–west route. */
const ARC_MIN_Y = 6;

export function arcPath(a: Point, b: Point): string {
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;

  // A quadratic Bézier's apex sits at t = 0.5, which is HALF WAY between the
  // midpoint and the control point: B(0.5).y = (a.y + 2·cy + b.y) / 4, i.e.
  // (midY + cy) / 2. So lifting the visible apex by L needs a control point at
  // 2L. Getting this wrong is why hand-tuned arcs always come out too flat.
  const controlY = Math.max(ARC_MIN_Y, midY - chord * ARC_APEX_RATIO * 2);

  return `M ${round(a.x)} ${round(a.y)} Q ${round(midX)} ${round(controlY)} ${round(b.x)} ${round(b.y)}`;
}

export type RouteGeometry = {
  path: string;
  /** X offset of the duplicate copy, or 0 when the route does not wrap. */
  wrapShift: number;
  from: Point;
  to: Point;
};

/**
 * The arc between two countries, taking the SHORT way round.
 *
 * Auckland (lng 174) to Los Angeles (lng −118) is 68° apart across the Pacific
 * and 292° the other way. A naive line between the two projected points draws
 * the 292° version — straight across Africa. So the destination is first moved
 * into extended longitude space, where the span is always the short one; the
 * arc may then run off the box, and the caller draws the same path a second
 * time shifted by one map width so whichever half leaves one edge reappears at
 * the other, with a clipPath hiding the rest.
 */
export function routeGeometry(from: Coordinates, to: Coordinates): RouteGeometry {
  let lng = to.lng;
  const delta = lng - from.lng;
  if (delta > 180) lng -= 360;
  else if (delta < -180) lng += 360;

  const a = project(from);
  const b = project({ lat: to.lat, lng });

  return {
    path: arcPath(a, b),
    // The destination was moved WEST, so the duplicate belongs one width EAST.
    wrapShift: lng === to.lng ? 0 : lng < to.lng ? MAP_WIDTH : -MAP_WIDTH,
    from: a,
    // The PIN always sits at the true longitude, never the extended one.
    to: project(to),
  };
}
