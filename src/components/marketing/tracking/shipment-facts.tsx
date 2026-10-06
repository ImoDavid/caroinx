import { formatDate, formatWeight } from "@/lib/format";
import type { PublicShipment } from "@/types/tracking";
import { SHIPMENT_STATUS_LABELS, TRANSPORT_TYPE_LABELS } from "@/validations/shipment";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-border-subtle pb-space-sm last:border-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-space-sm">
      <dt className="text-body-sm text-text-muted">{label}</dt>
      <dd className="text-body-sm font-medium break-words text-on-surface">{value}</dd>
    </div>
  );
}

export function ShipmentFacts({ shipment }: { shipment: PublicShipment }) {
  return (
    <section
      aria-labelledby="shipment-facts-heading"
      data-print="block"
      className="rounded-2xl bg-surface-white p-space-md shadow-md sm:p-space-lg"
    >
      <h2
        id="shipment-facts-heading"
        className="font-display text-title-sm font-bold text-on-surface"
      >
        Shipment details
      </h2>

      <dl className="space-y-space-sm pt-space-md">
        <Fact label="Tracking status" value={SHIPMENT_STATUS_LABELS[shipment.status]} />
        <Fact label="Transport" value={TRANSPORT_TYPE_LABELS[shipment.transportType]} />
        <Fact label="Weight" value={formatWeight(shipment.weightKg)} />
        <Fact
          label="Shipping date"
          value={<time dateTime={shipment.shipDate}>{formatDate(shipment.shipDate)}</time>}
        />
        {/* Omitted, never em-dashed: an arrival date is genuinely optional, and a
            blank row reads as a missing promise rather than an absent fact. */}
        {shipment.expectedDelivery ? (
          <Fact
            label="Expected delivery"
            value={
              <time dateTime={shipment.expectedDelivery}>
                {formatDate(shipment.expectedDelivery)}
              </time>
            }
          />
        ) : null}
      </dl>
    </section>
  );
}
