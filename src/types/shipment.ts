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

export type ShipmentStatusEvent = {
  status: ShipmentStatus;
  changedAt: string;
  /** The admin user id that made the change. */
  changedBy?: string;
  note?: string;
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
  sender: { name: string; location: string; phone?: string };
  receiver: { name: string; location: string; phone?: string; email?: string };
  statusHistory: ShipmentStatusEvent[];
  updatedAt: string;
};

export type ShipmentPage = {
  items: ShipmentSummary[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};
