import type { CountryCode } from "@/lib/countries";
import type { ShipmentPhoto } from "@/types/shipment";
import type { ShipmentStatus, TransportType } from "@/validations/shipment";

/**
 * What the PUBLIC tracking page renders.
 *
 * A separate module from `@/types/shipment` on purpose: anyone holding a
 * tracking code can see every field in here, so the shape is a deliberate
 * allow-list rather than a subtraction from `ShipmentDetail`. Keeping the two
 * side by side in one file would invite passing the wrong one to a public
 * component.
 *
 * Absent on purpose:
 *   - `id`                        the Mongo ObjectId; an internal handle
 *   - `statusHistory[].changedBy` an admin user id
 *   - `createdAt` / `updatedAt`   replaced by `lastUpdatedAt`, derived from the
 *                                 status history, which is what a customer
 *                                 actually means by "last updated"
 *
 * Present on purpose, against the usual instinct: both parties' phone numbers
 * and the receiver's email. That is a deliberate product decision — see
 * CLAUDE.md gap 15 — and there is a test asserting they are present, so it is
 * not "fixed" later as if it were a leak.
 */
export type TrackingParty = {
  name: string;
  /** Absent on shipments created before the country field existed. */
  country?: CountryCode;
  location: string;
  phone?: string;
  /** Receiver only: `senderSchema` has no email field. */
  email?: string;
};

export type TrackingEvent = {
  status: ShipmentStatus;
  changedAt: string;
  note?: string;
};

export type PublicShipment = {
  trackingCode: string;
  status: ShipmentStatus;
  sender: TrackingParty;
  receiver: TrackingParty;
  transportType: TransportType;
  weightKg: number;
  shipDate: string;
  expectedDelivery?: string;
  /** The customs charge in USD, when one was levied. */
  amount?: number;
  photo?: ShipmentPhoto;
  /** Oldest first, as stored. Renderers reverse it if they want newest first. */
  history: TrackingEvent[];
  lastUpdatedAt: string;
};
