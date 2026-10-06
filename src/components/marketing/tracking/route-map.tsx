import { COUNTRY_COORDINATES } from "@/lib/country-coordinates";
import { COUNTRY_NAMES, flagEmoji, type CountryCode } from "@/lib/countries";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  project,
  projectPercent,
  routeGeometry,
} from "@/lib/map-projection";
import { cn } from "@/lib/utils";
import type { TrackingParty } from "@/types/tracking";

/**
 * The shipment route: a world silhouette with a pin at each country and a dotted
 * arc between them.
 *
 * Country-granular by design — `location` is free text and is never geocoded, so
 * the pin is the country's label anchor, not the street address.
 *
 * A Server Component with no client JavaScript: the map is a committed SVG used
 * as a CSS background (the same mechanism telemetry-hub.tsx uses for
 * suez-canal-map.svg, which also avoids needing `dangerouslyAllowSVG`), and the
 * overlay is one inline `<svg>` plus two positioned chips.
 */

const PIN_RADIUS = 7;

function Chip({
  code,
  label,
  city,
  className,
  style,
}: {
  code: CountryCode;
  label: string;
  city: string;
  className?: string;
  /** Set only for the on-map placements, whose position is data. */
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-lg bg-brand-abyss/90 px-2.5 py-1.5 text-label-sm text-white shadow-md backdrop-blur-sm",
        className,
      )}
    >
      <span aria-hidden="true">{flagEmoji(code)}</span>
      <span className="truncate">
        <span className="font-semibold">{label}</span>
        <span className="text-white/70"> · {city}</span>
      </span>
    </span>
  );
}

export function RouteMap({ sender, receiver }: { sender: TrackingParty; receiver: TrackingParty }) {
  const from = sender.country;
  const to = receiver.country;

  // Neither end recorded (pre-country shipments, CLAUDE.md gap 11): render
  // nothing. A blank navy rectangle with no pins is worse than no map at all.
  if (!from && !to) return null;

  const fromPoint = from ? project(COUNTRY_COORDINATES[from]) : undefined;
  const toPoint = to ? project(COUNTRY_COORDINATES[to]) : undefined;

  // Same country both ends: one pin and no arc. A zero-length chord would make
  // the Bézier degenerate, and "Nigeria to Nigeria" is a domestic move anyway.
  const domestic = Boolean(from && to && from === to);

  const route =
    from && to && !domestic
      ? routeGeometry(COUNTRY_COORDINATES[from], COUNTRY_COORDINATES[to])
      : undefined;

  return (
    <section
      aria-labelledby="route-map-heading"
      data-print="block"
      className="rounded-2xl bg-surface-white p-space-md shadow-md sm:p-space-lg"
    >
      <h2 id="route-map-heading" className="font-display text-title-sm font-bold text-on-surface">
        Shipment route
      </h2>

      <div className="relative mt-space-md aspect-2/1 w-full overflow-hidden rounded-xl bg-primary-container bg-[url('/brand/world-map.svg')] bg-contain bg-center bg-no-repeat">
        {/* aspect-2/1 matches the viewBox exactly, so the default
            preserveAspectRatio is already correct and needs no override. */}
        <svg
          viewBox={`0 0 ${String(MAP_WIDTH)} ${String(MAP_HEIGHT)}`}
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          {route ? (
            <>
              <defs>
                {/* A literal id is safe: there is exactly one map per page, and
                    useId() is unavailable in an async Server Component. */}
                <clipPath id="route-map-clip">
                  <rect width={MAP_WIDTH} height={MAP_HEIGHT} />
                </clipPath>
              </defs>
              <g clipPath="url(#route-map-clip)">
                <path
                  d={route.path}
                  fill="none"
                  stroke="#f8e138"
                  strokeWidth="2.5"
                  strokeDasharray="8 8"
                  strokeLinecap="round"
                  // Without this the stroke scales with the viewBox: in a 320px
                  // container it lands near 0.8px and the dots vanish.
                  vectorEffect="non-scaling-stroke"
                />
                {/* A route crossing the antimeridian leaves one edge and must
                    reappear at the other; the clip hides the rest. */}
                {route.wrapShift ? (
                  <path
                    d={route.path}
                    transform={`translate(${String(route.wrapShift)} 0)`}
                    fill="none"
                    stroke="#f8e138"
                    strokeWidth="2.5"
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
              </g>
            </>
          ) : null}

          {fromPoint ? (
            <circle
              cx={fromPoint.x}
              cy={fromPoint.y}
              r={PIN_RADIUS}
              fill="#f8e138"
              stroke="#0d1252"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {toPoint && !domestic ? (
            <circle
              cx={toPoint.x}
              cy={toPoint.y}
              r={PIN_RADIUS}
              fill="#ffffff"
              stroke="#0d1252"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {/* Chips move onto the map only from sm up. At 320px an absolutely
            positioned chip anchored near an edge pushes the page sideways, which
            responsive rule 2 forbids — so below sm they reflow beneath instead. */}
        {from ? (
          <Chip
            code={from}
            label={COUNTRY_NAMES[from]}
            city={sender.location}
            className="absolute hidden max-w-[45%] -translate-x-1/2 -translate-y-[calc(100%+0.65rem)] sm:inline-flex"
            {...positionStyle(from)}
          />
        ) : null}
        {to && !domestic ? (
          <Chip
            code={to}
            label={COUNTRY_NAMES[to]}
            city={receiver.location}
            className="absolute hidden max-w-[45%] -translate-x-1/2 translate-y-[0.65rem] sm:inline-flex"
            {...positionStyle(to)}
          />
        ) : null}
      </div>

      {/* The same information as a normal flow row: the only copy below sm, and
          a legend above it. */}
      <div className="flex flex-wrap items-center gap-space-sm pt-space-md sm:hidden">
        {from ? <Chip code={from} label={COUNTRY_NAMES[from]} city={sender.location} /> : null}
        {to && !domestic ? (
          <Chip code={to} label={COUNTRY_NAMES[to]} city={receiver.location} />
        ) : null}
      </div>

      {domestic && from ? (
        <p className="pt-space-md text-body-sm text-text-muted">
          Domestic route — origin and destination are both in {COUNTRY_NAMES[from]}.
        </p>
      ) : null}
      {from && !to ? (
        <p className="pt-space-md text-body-sm text-text-muted">
          The destination country was not recorded for this shipment.
        </p>
      ) : null}
      {!from && to ? (
        <p className="pt-space-md text-body-sm text-text-muted">
          The origin country was not recorded for this shipment.
        </p>
      ) : null}
    </section>
  );
}

/** Inline positioning: the coordinates are data, so they cannot be Tailwind
 *  classes — Tailwind only emits utilities it can see at build time. */
function positionStyle(code: CountryCode): { style: React.CSSProperties } {
  const { left, top } = projectPercent(COUNTRY_COORDINATES[code]);
  return { style: { left: `${String(left)}%`, top: `${String(top)}%` } };
}
