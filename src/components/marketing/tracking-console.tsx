import { Radio } from "lucide-react";

import { TrackForm } from "./tracking/track-form";

/**
 * The tracking panel that overlaps the hero.
 *
 * A Server Component: it was a client module while its three mode tabs and its
 * hardcoded result panel were mock state, and none of that survives now that
 * the lookup is real. The form posts a plain GET to /track, so the whole
 * console works with JavaScript disabled.
 */
export function TrackingConsole() {
  return (
    <div className="rounded-2xl bg-surface-white p-space-md text-on-surface shadow-xl md:p-space-lg">
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm">
        {/* An h2: the hero's h1 is #hero-heading, directly above this. */}
        <h2 className="font-display text-title-sm font-bold text-primary-container">
          Track your shipment
        </h2>
        <div className="hidden items-center gap-2 text-label-sm text-text-muted md:flex">
          <Radio className="size-4 text-brand-olive" aria-hidden="true" />
          <span>Real-Time AIS &amp; IATA Flight Radar Sync Active</span>
        </div>
      </div>

      <TrackForm idPrefix="console" variant="console" />
    </div>
  );
}
