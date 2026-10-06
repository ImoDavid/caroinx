import { ShipmentPhotoView } from "@/components/admin/shipment-photo";
import { DutyFees } from "@/components/marketing/tracking/duty-fees";
import { PartyCard } from "@/components/marketing/tracking/party-card";
import { RouteMap } from "@/components/marketing/tracking/route-map";
import { ShipmentFacts } from "@/components/marketing/tracking/shipment-facts";
import { TrackingProgress } from "@/components/marketing/tracking/tracking-progress";
import { TrackingSummary } from "@/components/marketing/tracking/tracking-summary";
import { TrackingTimeline } from "@/components/marketing/tracking/tracking-timeline";
import type { PublicShipment } from "@/types/tracking";

/**
 * Composes a found shipment.
 *
 * Single column at 320 in reading order — summary, progress, route, parties,
 * details, parcel, duty, history — widening to a 2/1 split from `lg` with no
 * `order-*` reshuffling, because the DOM order is already the right one.
 */
export function TrackingResult({ shipment }: { shipment: PublicShipment }) {
  return (
    <div className="space-y-space-lg pt-space-lg">
      <TrackingSummary shipment={shipment} />
      <TrackingProgress shipment={shipment} />

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3 lg:gap-gutter-desktop">
        <div className="space-y-space-lg lg:col-span-2">
          <RouteMap sender={shipment.sender} receiver={shipment.receiver} />

          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            <PartyCard role="sender" party={shipment.sender} />
            <PartyCard role="receiver" party={shipment.receiver} />
          </div>

          <ShipmentFacts shipment={shipment} />

          <section
            aria-labelledby="parcel-heading"
            data-print="block"
            className="rounded-2xl bg-surface-white p-space-md shadow-md sm:p-space-lg"
          >
            <h2
              id="parcel-heading"
              className="font-display text-title-sm font-bold text-on-surface"
            >
              Parcel
            </h2>
            <div className="pt-space-md">
              {/* Reuses the admin renderer rather than adding a second
                  <CldImage> wrapper: CLAUDE.md rule 30 makes that file the one
                  import site for next-cloudinary. Its classes are all semantic
                  tokens, which `.light-only` restates for this subtree. */}
              <ShipmentPhotoView
                photo={shipment.photo}
                trackingCode={shipment.trackingCode}
                className="sm:max-w-sm md:max-w-md"
              />
            </div>
          </section>
        </div>

        <div className="space-y-space-lg">
          <DutyFees shipment={shipment} />
          <TrackingTimeline events={shipment.history} />
        </div>
      </div>
    </div>
  );
}
