import type { ShipmentStatus, TransportType } from "@/validations/shipment";

/**
 * The plain, serializable shapes the metrics service returns to the admin
 * Overview.
 *
 * Here rather than in the service because the chart components render them and
 * `@/services/*` is a restricted import for client-side code
 * (eslint.config.mjs, CLAUDE.md rule 21). Every date is an ISO 8601 string.
 *
 * Every field maps to something actually stored. Deliberately ABSENT, because
 * the data cannot support them without inventing a number:
 *   - revenue        `amount` is a customs levy on a held consignment, not income.
 *   - on-time rate   nothing records a promised-versus-actual delivery pair.
 *   - customers      there is no customer entity; a party is free text on a shipment.
 *   - response time  derivable only by pairing consecutive message timestamps.
 */

/** One day of the trend series. Always present, including days with no activity. */
export type DailyCount = {
  /** Midnight UTC for the bucket, ISO 8601. */
  date: string;
  count: number;
};

export type StatusCount = {
  status: ShipmentStatus;
  count: number;
};

export type TransportCount = {
  transportType: TransportType;
  count: number;
};

export type ShipmentMetrics = {
  total: number;
  /** Every status, including those with a count of 0, in `SHIPMENT_STATUSES` order. */
  byStatus: StatusCount[];
  byTransport: TransportCount[];
  /** Exactly `TREND_DAYS` entries, oldest first, zero-filled. */
  createdDaily: DailyCount[];
  /** Consignments currently `customs_held`. */
  heldCount: number;
  /** Total USD levied across those holds. `0` when none carry an amount. */
  heldAmount: number;
  /** Past `expectedDelivery` and not yet delivered. */
  overdueCount: number;
};

export type ConversationMetrics = {
  open: number;
  unread: number;
};

export type AdminMetrics = {
  shipments: ShipmentMetrics;
  conversations: ConversationMetrics;
};
