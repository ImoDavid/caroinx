import { describe, expect, it } from "vitest";

import {
  areaPath,
  axisTicks,
  barPercent,
  CHART_HEIGHT,
  CHART_PADDING,
  CHART_WIDTH,
  linePath,
  MIN_BAR_PERCENT,
  niceMax,
  seriesPoints,
  valueY,
} from "@/lib/chart-geometry";

const PLOT_LEFT = CHART_PADDING.left;
const PLOT_RIGHT = CHART_WIDTH - CHART_PADDING.right;
const PLOT_BOTTOM = CHART_HEIGHT - CHART_PADDING.bottom;

describe("niceMax", () => {
  it("never returns zero, so an all-zero series cannot divide by it", () => {
    expect(niceMax([0, 0, 0])).toBe(1);
    expect(niceMax([])).toBe(1);
  });

  it("rounds up to a 1/2/5 step so the axis reads in whole consignments", () => {
    expect(niceMax([3])).toBe(5);
    expect(niceMax([7])).toBe(10);
    expect(niceMax([12])).toBe(20);
    expect(niceMax([34])).toBe(50);
    expect(niceMax([120])).toBe(200);
  });

  it("leaves an exact step alone rather than jumping a band", () => {
    expect(niceMax([5])).toBe(5);
    expect(niceMax([10])).toBe(10);
    expect(niceMax([1])).toBe(1);
  });

  it("ignores negatives rather than inverting the axis", () => {
    expect(niceMax([-5, 2])).toBe(2);
  });
});

describe("axisTicks", () => {
  it("spans 0 to max inclusive", () => {
    const ticks = axisTicks(10);
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)).toBe(10);
  });

  it("returns whole numbers only — a count axis has no halves", () => {
    for (const tick of axisTicks(10)) expect(Number.isInteger(tick)).toBe(true);
  });

  it("collapses rather than subdividing when max is below the tick count", () => {
    expect(axisTicks(1)).toEqual([0, 1]);
    expect(axisTicks(2)).toEqual([0, 1, 2]);
  });

  it("emits no duplicate ticks", () => {
    const ticks = axisTicks(1, 5);
    expect(new Set(ticks).size).toBe(ticks.length);
  });
});

describe("seriesPoints", () => {
  it("spans the plot width from first to last", () => {
    const points = seriesPoints([1, 2, 3], 3);

    expect(points[0]?.x).toBe(PLOT_LEFT);
    expect(points.at(-1)?.x).toBe(PLOT_RIGHT);
  });

  it("puts the max at the top of the plot and zero on the baseline", () => {
    const points = seriesPoints([0, 10], 10);

    expect(points[0]?.y).toBe(PLOT_BOTTOM);
    expect(points[1]?.y).toBe(CHART_PADDING.top);
  });

  it("places a single point at the left edge instead of dividing by zero", () => {
    const points = seriesPoints([4], 4);

    expect(points).toHaveLength(1);
    expect(points[0]?.x).toBe(PLOT_LEFT);
    expect(Number.isFinite(points[0]?.y)).toBe(true);
  });

  it("flattens an all-zero series onto the baseline", () => {
    const points = seriesPoints([0, 0, 0], 1);

    expect(points.every((point) => point.y === PLOT_BOTTOM)).toBe(true);
  });

  it("produces finite coordinates when max is zero", () => {
    const points = seriesPoints([0, 0], 0);

    expect(points.every((point) => Number.isFinite(point.y))).toBe(true);
  });

  it("clamps a value above max to the top rather than overshooting the plot", () => {
    const points = seriesPoints([20], 10);

    expect(points[0]?.y).toBe(CHART_PADDING.top);
  });

  it("handles the real 30-day window", () => {
    const points = seriesPoints(
      Array.from({ length: 30 }, (_, i) => i),
      29,
    );

    expect(points).toHaveLength(30);
    expect(points[0]?.x).toBe(PLOT_LEFT);
    expect(points.at(-1)?.x).toBe(PLOT_RIGHT);
  });
});

describe("valueY", () => {
  it("agrees with seriesPoints for the same value", () => {
    const [point] = seriesPoints([7], 10);

    expect(valueY(7, 10)).toBe(point?.y);
  });
});

describe("linePath", () => {
  it("is empty for no points, so an empty series renders nothing", () => {
    expect(linePath([])).toBe("");
  });

  it("moves to the first point and lines to the rest", () => {
    expect(
      linePath([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]),
    ).toBe("M 1 2 L 3 4");
  });
});

describe("areaPath", () => {
  it("is empty for no points", () => {
    expect(areaPath([])).toBe("");
  });

  it("closes the shape down to the baseline", () => {
    const path = areaPath([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);

    expect(path.startsWith("M 1 2 L 3 4")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).toContain(`L 3 ${String(PLOT_BOTTOM)}`);
    expect(path).toContain(`L 1 ${String(PLOT_BOTTOM)}`);
  });
});

describe("barPercent", () => {
  it("gives zero no width at all, so an empty status shows an empty track", () => {
    expect(barPercent(0, 10)).toBe(0);
  });

  it("fills the track at the maximum", () => {
    expect(barPercent(10, 10)).toBe(100);
  });

  it("keeps a tiny non-zero count visible beside a huge one", () => {
    expect(barPercent(1, 400)).toBe(MIN_BAR_PERCENT);
  });

  it("scales proportionally in between", () => {
    expect(barPercent(5, 10)).toBe(50);
  });

  it("does not divide by zero when every count is zero", () => {
    expect(barPercent(0, 0)).toBe(0);
  });
});
