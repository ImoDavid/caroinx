import type { Metadata } from "next";

import { TrackForm } from "@/components/marketing/tracking/track-form";
import { TrackingResult } from "@/components/marketing/tracking/tracking-result";
import {
  TrackingEmpty,
  TrackingInvalid,
  TrackingNotFound,
} from "@/components/marketing/tracking/tracking-states";
import { getShipmentByTrackingCode } from "@/services/shipment.service";
import { trackingCodeSchema } from "@/validations/shipment";

/**
 * Public shipment tracking. No authentication: the tracking code is the secret.
 *
 * There is deliberately NO `export const dynamic`. Reading `searchParams` is
 * itself a request-time API and already opts this route out of prerendering, so
 * `next build` never opens a database connection here. `force-dynamic` would be
 * dead configuration — the same reasoning next.config.ts uses to refuse an
 * images.remotePatterns entry. The build output must show `/track` as `ƒ`.
 */

/** A hand-edited query string can repeat the key; take the first value. */
function readCode(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Caps what is echoed back into the page. React escapes it — this is a layout
 *  guard against a 5 KB query string, not an XSS one. */
function forDisplay(code: string): string {
  return code.slice(0, 40);
}

export async function generateMetadata({ searchParams }: PageProps<"/track">): Promise<Metadata> {
  const raw = readCode((await searchParams).code);
  // Deliberately NO database read: the title needs only the code, and a lookup
  // here would double the query on every page view.
  const parsed = trackingCodeSchema.safeParse(raw);

  return {
    title: parsed.success ? `Tracking ${parsed.data}` : "Track a shipment",
    description:
      "Follow your consignment with True Global Route Logistics. Enter your tracking code for live status, route and delivery details.",
    // A result names two people, their addresses, their phone numbers and an
    // email address. It must never enter a search index. The empty form may.
    robots: raw ? { index: false, follow: false } : undefined,
  };
}

export default async function TrackPage({ searchParams }: PageProps<"/track">) {
  const raw = readCode((await searchParams).code);
  const parsed = raw ? trackingCodeSchema.safeParse(raw) : undefined;

  // An invalid code never reaches the database — the service re-checks too, so
  // this is about not paying for a query, not about trust.
  const shipment = parsed?.success ? await getShipmentByTrackingCode(parsed.data) : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-margin py-space-xl md:px-margin-tablet md:py-space-2xl lg:px-margin-desktop">
      <div data-print="hide">
        <h1 className="font-display text-headline-lg-mobile text-primary-container sm:text-headline-lg">
          Track your shipment
        </h1>
        <p className="max-w-prose pt-space-xs text-body-base text-on-surface-variant">
          Enter the tracking code from your consignment receipt to see where it is right now.
        </p>
        <div className="pt-space-md">
          <TrackForm idPrefix="page" variant="page" defaultValue={forDisplay(raw)} />
        </div>
      </div>

      {!raw ? <TrackingEmpty /> : null}
      {raw && !parsed?.success ? <TrackingInvalid code={forDisplay(raw)} /> : null}
      {parsed?.success && !shipment ? <TrackingNotFound code={parsed.data} /> : null}
      {shipment ? <TrackingResult shipment={shipment} /> : null}
    </div>
  );
}
