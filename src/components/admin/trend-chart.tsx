import {
  areaPath,
  axisTicks,
  CHART_HEIGHT,
  CHART_PADDING,
  CHART_WIDTH,
  linePath,
  niceMax,
  seriesPoints,
  valueY,
} from "@/lib/chart-geometry";
import { formatDate } from "@/lib/format";
import type { DailyCount } from "@/types/metrics";

/**
 * Shipments created per day.
 *
 * A Server Component with no client JavaScript: inline SVG, the geometry
 * computed by `lib/chart-geometry.ts`. There is no charting dependency in this
 * project and this needs none — the precedent is the public route map, which
 * draws Bézier arcs over a projected world map the same way.
 *
 * ONE series, so no categorical palette is involved — which matters, because
 * the `--chart-*` tokens are a sequential navy ramp plus a gold accent and
 * fail the colour-separation checks if used as five categories. The stroke is
 * `--primary`, which is navy in light and gold in dark, so it is contrast-
 * correct in both themes by construction rather than by a second token.
 *
 * The SVG is `aria-hidden` and the same numbers are published as a
 * visually-hidden table, so the data never depends on seeing the picture.
 */

export type TrendChartProps = {
  series: DailyCount[];
  /** Describes the series for screen readers and names the table. */
  caption: string;
};

export function TrendChart({ series, caption }: TrendChartProps) {
  const values = series.map((point) => point.count);
  const max = niceMax(values);
  const points = seriesPoints(values, max);
  const ticks = axisTicks(max);

  const total = values.reduce((sum, value) => sum + value, 0);
  const first = series[0];
  const last = series.at(-1);
  const only = points.length === 1 ? points[0] : undefined;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${String(CHART_WIDTH)} ${String(CHART_HEIGHT)}`}
        // h-auto + w-full: the viewBox owns the aspect ratio, so the chart
        // scales to its card at every width with no media queries.
        className="h-auto w-full overflow-visible"
        aria-hidden="true"
        focusable="false"
      >
        {ticks.map((tick) => {
          const y = valueY(tick, max);
          return (
            <g key={tick}>
              <line
                x1={CHART_PADDING.left}
                y1={y}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y2={y}
                className="stroke-border"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={CHART_PADDING.left - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                // Recessive: the axis is reference, not content.
                className="fill-muted-foreground text-[10px]"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {total > 0 ? (
          <>
            <path d={areaPath(points)} className="fill-primary/10" />
            <path
              d={linePath(points)}
              fill="none"
              className="stroke-primary"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              // Without this the stroke scales with the viewBox and lands near
              // 0.8px in a 320px container — the lesson route-map.tsx records.
              vectorEffect="non-scaling-stroke"
            />
            {only ? <circle cx={only.x} cy={only.y} r="3" className="fill-primary" /> : null}
          </>
        ) : null}
      </svg>

      <div className="flex items-baseline justify-between pt-space-xs text-label-sm text-muted-foreground">
        <span>{first ? formatDate(first.date) : null}</span>
        <span>{last ? formatDate(last.date) : null}</span>
      </div>

      {/* The accessible equivalent of the picture. `sr-only` rather than a
          toggle: it is reference data, and a disclosure nobody opens is not an
          accessibility feature. */}
      <figcaption className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Shipments created</th>
            </tr>
          </thead>
          <tbody>
            {series.map((point) => (
              <tr key={point.date}>
                <th scope="row">{formatDate(point.date)}</th>
                <td>{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
