import { CalendarCheck, Clock } from "lucide-react";

import { PrintButton } from "@/components/marketing/tracking/print-button";
import { formatDate, formatDateTime } from "@/lib/format";
import type { PublicShipment } from "@/types/tracking";
import { SHIPMENT_STATUS_LABELS } from "@/validations/shipment";

/**
 * The navy identity band at the top of a result: what was looked up, where it
 * is now, and when that was last true.
 */
export function TrackingSummary({ shipment }: { shipment: PublicShipment }) {
  const held = shipment.status === "customs_held";

  return (
    <section
      aria-labelledby="tracking-summary-heading"
      data-print="block"
      className="rounded-2xl bg-primary-container p-space-md text-white shadow-xl sm:p-space-lg"
    >
      <div className="flex flex-col gap-space-md lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-space-xs">
          <p className="text-label-badge font-bold tracking-wider text-secondary-container uppercase">
            Tracking code
          </p>
          {/* break-all, not truncate: a customer comparing this against a
              printed label must be able to read every character. */}
          <h2
            id="tracking-summary-heading"
            className="font-display font-mono text-headline-md-mobile break-all text-white sm:text-headline-md"
          >
            {shipment.trackingCode}
          </h2>
          <p className="flex flex-wrap items-center gap-x-space-sm gap-y-1">
            <span
              className={
                held
                  ? "rounded-badge bg-secondary-container px-2.5 py-1 text-label-badge font-bold text-on-primary-fixed uppercase"
                  : "rounded-badge bg-white/15 px-2.5 py-1 text-label-badge font-bold text-white uppercase"
              }
            >
              {SHIPMENT_STATUS_LABELS[shipment.status]}
            </span>
            <span className="inline-flex items-center gap-1.5 text-label-sm text-white/70">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              Updated{" "}
              <time dateTime={shipment.lastUpdatedAt}>
                {formatDateTime(shipment.lastUpdatedAt)}
              </time>
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center lg:flex-col lg:items-end">
          {shipment.expectedDelivery ? (
            <div className="flex items-center gap-space-xs rounded-xl bg-white/10 px-space-md py-space-sm">
              <CalendarCheck
                className="size-5 shrink-0 text-secondary-container"
                aria-hidden="true"
              />
              <div>
                <div className="text-label-sm text-white/70">Expected delivery</div>
                <div className="font-display text-title-sm font-bold text-white">
                  <time dateTime={shipment.expectedDelivery}>
                    {formatDate(shipment.expectedDelivery)}
                  </time>
                </div>
              </div>
            </div>
          ) : null}
          <PrintButton />
        </div>
      </div>
    </section>
  );
}
