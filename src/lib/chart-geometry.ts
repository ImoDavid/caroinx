/**
 * Geometry for the admin dashboard's charts.
 *
 * A pure, tested module with the components rendering only what it returns —
 * the same split `lib/map-projection.ts` uses for the public route map, and for
 * the same reason: the arithmetic is where chart bugs live, and it is the part
 * that can be asserted without a DOM.
 *
 * There is no charting dependency in this project and this is why one is not
 * needed: two charts, both of which are a handful of coordinates.
 *
 * Client-safe: no `server-only`, no environment access, no dependencies.
 */

export type Point = { x: number; y: number };

/** The line chart's coordinate space. Rendered through a viewBox, so these are
 *  arbitrary units and the SVG scales to its container. */
export const CHART_WIDTH = 600;
export const CHART_HEIGHT = 180;

/** Room for the value axis labels on the left and the date labels below. */
export const CHART_PADDING = { top: 8, right: 4, bottom: 18, left: 28 } as const;

const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

/** One decimal is far under a pixel at this scale and halves the path string —
 *  the same rounding `map-projection.ts` applies. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * The top of the value axis.
 *
 * Always at least 1, so an all-zero series renders a flat line along the
 * baseline instead of dividing by zero. Rounded up to a 1/2/5 × 10ⁿ step so the
 * axis reads in whole consignments rather than "3.7".
 */
export function niceMax(values: readonly number[]): number {
  const peak = Math.max(0, ...values);
  if (peak <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const normalised = peak / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;

  return step * magnitude;
}

/**
 * Evenly spaced axis ticks from 0 to `max` inclusive.
 *
 * Returns whole numbers only: a count axis labelled 0 / 0.5 / 1 would be
 * nonsense, so when `max` is smaller than the requested tick count the ticks
 * collapse rather than subdivide.
 */
export function axisTicks(max: number, count = 3): number[] {
  const safeMax = Math.max(1, Math.floor(max));
  const steps = Math.min(count, safeMax);
  const size = safeMax / steps;

  const ticks: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const value = Math.round(i * size);
    if (ticks.at(-1) !== value) ticks.push(value);
  }
  return ticks;
}

/**
 * Maps a series to plot coordinates.
 *
 * A single point sits at the left edge rather than dividing by zero; the
 * renderer draws a dot for that case because a one-point path has no line.
 */
export function seriesPoints(values: readonly number[], max: number): Point[] {
  const span = Math.max(1, values.length - 1);
  const top = Math.max(1, max);

  return values.map((value, index) => ({
    x: round(CHART_PADDING.left + (index / span) * PLOT_WIDTH),
    y: round(CHART_PADDING.top + (1 - Math.min(value, top) / top) * PLOT_HEIGHT),
  }));
}

/** The y coordinate of a value on the same scale — for gridlines and labels. */
export function valueY(value: number, max: number): number {
  const top = Math.max(1, max);
  return round(CHART_PADDING.top + (1 - Math.min(value, top) / top) * PLOT_HEIGHT);
}

/** `M x y L x y …` — a polyline. Deliberately not smoothed: a spline through
 *  daily counts invents values between the days that were actually measured. */
export function linePath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

/** The line closed down to the baseline, for the area fill beneath it. */
export function areaPath(points: readonly Point[]): string {
  if (points.length === 0) return "";

  const baseline = round(CHART_PADDING.top + PLOT_HEIGHT);
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return "";

  return `${linePath(points)} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

/**
 * Horizontal bar widths as a percentage of the track.
 *
 * Percentages rather than SVG units because the bar chart is plain HTML — the
 * labels have to wrap and ellipsise at 320px, which is markup a `<text>` element
 * cannot do.
 *
 * A non-zero count always gets at least `MIN_BAR_PERCENT` so a count of 1 beside
 * a count of 400 is still visible as a mark rather than a hairline.
 */
export const MIN_BAR_PERCENT = 2;

export function barPercent(value: number, max: number): number {
  if (value <= 0) return 0;
  const top = Math.max(1, max);
  return Math.max(MIN_BAR_PERCENT, round((value / top) * 100));
}
