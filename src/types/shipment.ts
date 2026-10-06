import type { CountryCode } from "@/lib/countries";
import type { ShipmentStatus, TransportType } from "@/validations/shipment";

/**
 * The plain, serializable shapes the shipment service returns.
 *
 * They live here rather than in the service because components render them, and
 * `@/services/*` is a restricted import for client-side code (eslint.config.mjs)
 * — correctly so: importing the service for a *type* would still name a module
 * whose runtime pulls in Mongoose.
 *
 * Every date is an ISO 8601 string, not a `Date`, so these cross the
 * server/client boundary unchanged and format deterministically via
 * `@/lib/format`.
 */

/**
 * One end of a consignment. `country` is the ISO code the map pins; `location` is
 * the city or address a human reads on a label.
 */
export type ShipmentParty = {
  name: string;
  /**
   * Optional on the way OUT even though the schema requires it on the way in:
   * shipments written before this field existed have no country, and a DTO that
   * claimed otherwise would hand `undefined` to code typed to expect a code.
   * Renderers show a placeholder; the edit form falls back to the default.
   */
  country?: CountryCode;
  location: string;
  phone?: string;
};

export type ShipmentStatusEvent = {
  status: ShipmentStatus;
  changedAt: string;
  /** The admin user id that made the change. */
  changedBy?: string;
  note?: string;
};

/**
 * A photo hosted on Cloudinary.
 *
 * Both handles are stored on purpose: `publicId` is what <CldImage> and a future
 * destroy call need, while `url` is what plain next/image needs and is the
 * durable record if next-cloudinary is ever dropped. `width`/`height` let the
 * renderer reserve the right box, so the page does not shift as the image loads.
 */
export type ShipmentPhoto = {
  url: string;
  publicId: string;
  width: number;
  height: number;
};

export type ShipmentSummary = {
  id: string;
  trackingCode: string;
  senderName: string;
  receiverName: string;
  transportType: TransportType;
  weightKg: number;
  shipDate: string;
  status: ShipmentStatus;
  createdAt: string;
};

export type ShipmentDetail = ShipmentSummary & {
  sender: ShipmentParty;
  receiver: ShipmentParty & { email?: string };
  statusHistory: ShipmentStatusEvent[];
  /** Absent when the arrival date was not known at booking. */
  expectedDelivery?: string;
  /** Absent on every shipment created before photo upload existed, and on any
   *  consignment the operator chose not to photograph. */
  photo?: ShipmentPhoto;
  /** The customs charge in USD. Recorded only while held at customs, and kept
   *  afterwards as the record of what was levied. */
  amount?: number;
  updatedAt: string;
};

export type ShipmentPage = {
  items: ShipmentSummary[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

/**
 * The two fields another record needs to point at a consignment: enough to
 * denormalise and to build a link to `/admin/cargo/<id>`, and nothing else.
 *
 * Exists because a support conversation can name a tracking code, and
 * `PublicShipment` deliberately carries no `id` (see `@/types/tracking`) while
 * `ShipmentDetail` carries far too much. Resolving a code must not become a back
 * door to shipment data from a public code path.
 */
export type ShipmentLink = {
  id: string;
  trackingCode: string;
};
