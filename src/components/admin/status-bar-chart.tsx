import { barPercent } from "@/lib/chart-geometry";
import type { StatusCount } from "@/types/metrics";
import { SHIPMENT_STATUS_LABELS } from "@/validations/shipment";

/**
 * Where every consignment currently sits.
 *
 * HTML bars, not SVG: the status labels have to wrap and ellipsise at 320px,
 * which `<text>` cannot do. Horizontal rather than vertical for the same
 * reason — "Picked up by courier" is unreadable rotated under a column.
 *
 * ALL BARS SHARE ONE COLOUR, deliberately. The status name is already on the
 * row, so colour would carry no information — and five distinguishable hues
 * are exactly what this project's `--chart-*` tokens cannot provide: they are
 * a single-hue navy ramp, which fails the colour-separation checks as a
 * categorical palette. `status-badge.tsx`'s tone map cannot stand in either:
 * `picked_by_courier` and `on_the_way` share a tone there.
 *
 * Bars are rendered in `SHIPMENT_STATUSES` order, which is the real pipeline
 * order, so the shape of the row stack is itself meaningful.
 *
 * A Server Component with no client JavaScript.
 */

export type StatusBarChartProps = {
  counts: StatusCount[];
  caption: string;
};

export function StatusBarChart({ counts, caption }: StatusBarChartProps) {
  const max = Math.max(1, ...counts.map((entry) => entry.count));

  return (
    <figure className="m-0">
      <table className="w-full border-separate border-spacing-y-1.5">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {counts.map((entry) => {
            const percent = barPercent(entry.count, max);

            return (
              <tr key={entry.status}>
                <th
                  scope="row"
                  className="w-[9.5rem] max-w-[9.5rem] pr-space-sm text-left align-middle text-body-sm font-normal text-muted-foreground"
                >
                  {SHIPMENT_STATUS_LABELS[entry.status]}
                </th>
                <td className="align-middle">
                  <div className="flex items-center gap-space-sm">
                    {/* The track makes an empty status legible as "zero here",
                        not as a missing row. */}
                    <div className="h-2.5 min-w-0 flex-1 rounded-full bg-muted">
                      <div
                        // Inline width: the value is data, and Tailwind only
                        // emits utilities it can see at build time — the same
                        // reason route-map.tsx positions its pins inline.
                        style={{ width: `${String(percent)}%` }}
                        className="h-full rounded-full bg-chart-3"
                      />
                    </div>
                    {/* Direct label, in text ink rather than the series colour. */}
                    <span className="w-8 shrink-0 text-right text-body-sm font-semibold tabular-nums">
                      {entry.count}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}
