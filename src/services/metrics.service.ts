import { connectToDatabase } from "@/lib/db";
import { ChatConversation } from "@/models/ChatConversation";
import { Shipment } from "@/models/Shipment";
import type {
  AdminMetrics,
  ConversationMetrics,
  DailyCount,
  ShipmentMetrics,
} from "@/types/metrics";
import { SHIPMENT_STATUSES, TRANSPORT_TYPES } from "@/validations/shipment";

// Re-exported so server callers can keep importing the shapes from the service
// they got them from; client code must import from "@/types/metrics".
export type {
  AdminMetrics,
  ConversationMetrics,
  DailyCount,
  ShipmentMetrics,
  StatusCount,
  TransportCount,
} from "@/types/metrics";

/** The trend window. Fixed rather than selectable: at this volume a 90-day
 *  daily series is mostly zeroes and reads as noise. */
export const TREND_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Aggregate reads behind the admin Overview.
 *
 * A service of its own rather than more exports on `shipment.service.ts`: these
 * answer "what is the shape of the whole book of work", not "give me this
 * consignment", and they are the only reads in the application that aggregate
 * rather than list. Reusing `listShipments` would mean fetching pages of
 * documents in order to count them.
 *
 * One `$facet` instead of six round trips. Every facet is backed by an existing
 * index except `overdue`, which scans — the same trade `countUnreadConversations`
 * documents and accepts at this volume. **No new index is introduced, so this
 * needs no `npm run db:indexes` run** (CLAUDE.md rule 16).
 *
 * Framework-free like every service (no `next/*`), so it is testable under
 * Vitest with no request context.
 */

/** Midnight UTC, `n` days back. UTC because `lib/format.ts` renders every date
 *  in UTC (rule 59) and Mongo's `$dateTrunc` defaults to it — so the buckets and
 *  their labels agree by construction. */
function utcMidnightDaysAgo(now: Date, days: number): Date {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(midnight - days * DAY_MS);
}

/** Mongo returns no row for a day with no shipments, and a line chart with
 *  missing days would compress the gaps and misstate the trend. */
function fillDays(rows: readonly { date: Date; count: number }[], from: Date): DailyCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.date.toISOString(), row.count);

  const series: DailyCount[] = [];
  for (let i = 0; i < TREND_DAYS; i += 1) {
    const date = new Date(from.getTime() + i * DAY_MS).toISOString();
    series.push({ date, count: counts.get(date) ?? 0 });
  }
  return series;
}

/** Shapes a `$group` result into the full enum, in declared order, zero-filled.
 *  A status missing from the chart because nothing currently has it would read
 *  as "that stage does not exist" rather than "nothing is there". */
function fillBuckets<K extends string>(
  keys: readonly K[],
  rows: readonly { _id: string | null; count: number }[],
): { key: K; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) if (row._id !== null) counts.set(row._id, row.count);
  return keys.map((key) => ({ key, count: counts.get(key) ?? 0 }));
}

type FacetRow = { _id: string | null; count: number };
type FacetResult = {
  total: { count: number }[];
  byStatus: FacetRow[];
  byTransport: FacetRow[];
  createdDaily: { _id: Date; count: number }[];
  held: { count: number; amount: number | null }[];
  overdue: { count: number }[];
};

export async function getShipmentMetrics(now = new Date()): Promise<ShipmentMetrics> {
  await connectToDatabase();

  const from = utcMidnightDaysAgo(now, TREND_DAYS - 1);

  const [facet] = await Shipment.aggregate<FacetResult>([
    {
      $facet: {
        total: [{ $count: "count" }],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        byTransport: [{ $group: { _id: "$transportType", count: { $sum: 1 } } }],
        createdDaily: [
          { $match: { createdAt: { $gte: from } } },
          {
            $group: {
              _id: { $dateTrunc: { date: "$createdAt", unit: "day" } },
              count: { $sum: 1 },
            },
          },
        ],
        held: [
          { $match: { status: "customs_held" } },
          // `amount` is optional even on a hold, so $sum skips the missing ones
          // rather than counting them as zero-value charges.
          { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
        ],
        overdue: [
          { $match: { expectedDelivery: { $lt: now }, status: { $ne: "delivered" } } },
          { $count: "count" },
        ],
      },
    },
  ]);

  // An empty collection still returns one $facet document, with every array
  // empty — so these defaults are the empty-database path, not a guard.
  const held = facet?.held[0];

  return {
    total: facet?.total[0]?.count ?? 0,
    byStatus: fillBuckets(SHIPMENT_STATUSES, facet?.byStatus ?? []).map(({ key, count }) => ({
      status: key,
      count,
    })),
    byTransport: fillBuckets(TRANSPORT_TYPES, facet?.byTransport ?? []).map(({ key, count }) => ({
      transportType: key,
      count,
    })),
    createdDaily: fillDays(
      (facet?.createdDaily ?? []).map((row) => ({ date: row._id, count: row.count })),
      from,
    ),
    heldCount: held?.count ?? 0,
    heldAmount: held?.amount ?? 0,
    overdueCount: facet?.overdue[0]?.count ?? 0,
  };
}

export async function getConversationMetrics(): Promise<ConversationMetrics> {
  await connectToDatabase();

  const [open, unread] = await Promise.all([
    ChatConversation.countDocuments({ status: "open" }),
    ChatConversation.countDocuments({ unreadForAdmin: { $gt: 0 } }),
  ]);

  return { open, unread };
}

/** Both halves in parallel — the house pattern from `listShipments`. */
export async function getAdminMetrics(now = new Date()): Promise<AdminMetrics> {
  const [shipments, conversations] = await Promise.all([
    getShipmentMetrics(now),
    getConversationMetrics(),
  ]);

  return { shipments, conversations };
}
