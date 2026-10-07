import type mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  appendVisitorMessage,
  closeConversation,
  generateVisitorId,
  startConversation,
} from "@/services/chat.service";
import { getAdminMetrics, getShipmentMetrics, TREND_DAYS } from "@/services/metrics.service";
import { createShipment, updateShipmentStatus } from "@/services/shipment.service";
import { SHIPMENT_STATUSES, shipmentCreateSchema } from "@/validations/shipment";

import { openTestConnection } from "../helpers/db.ts";

const ACTOR = "admin-user-id";

/**
 * Conversations are opened through the service, not inserted raw: the unique
 * index on `visitorToken` rejects a second document without one, and going
 * through the real path is the convention `chat-service.test.ts` sets.
 */
async function startChat(): Promise<string> {
  const result = await startConversation({ name: "Ada Okafor" }, generateVisitorId());
  if (typeof result === "string") throw new Error(`startConversation refused: ${result}`);
  return result.token;
}

async function idOf(token: string): Promise<string> {
  const doc = await db.collection("chatconversations").findOne({ visitorToken: token });
  return String(doc?._id);
}

let db: mongoose.mongo.Db;
let close: () => Promise<void>;

/** Fixtures are built THROUGH the schema, not hand-written. */
function input(overrides: Record<string, unknown> = {}) {
  return shipmentCreateSchema.parse({
    sender: { name: "Ada Freight", country: "NG", location: "Lagos" },
    receiver: { name: "Grace Imports", country: "GH", location: "Accra" },
    details: { transportType: "air", weightKg: "12.5", shipDate: "2026-03-12" },
    ...overrides,
  });
}

beforeAll(async () => {
  ({ db, close } = await openTestConnection());
});

afterAll(async () => {
  await close();
});

beforeEach(async () => {
  await db.collection("shipments").deleteMany({});
  await db.collection("chatconversations").deleteMany({});
});

describe("getShipmentMetrics", () => {
  it("returns zeros for an empty database rather than throwing", async () => {
    const metrics = await getShipmentMetrics();

    expect(metrics.total).toBe(0);
    expect(metrics.heldCount).toBe(0);
    expect(metrics.heldAmount).toBe(0);
    expect(metrics.overdueCount).toBe(0);
  });

  it("lists every status even when nothing has it, in pipeline order", async () => {
    const metrics = await getShipmentMetrics();

    expect(metrics.byStatus.map((entry) => entry.status)).toEqual([...SHIPMENT_STATUSES]);
    expect(metrics.byStatus.every((entry) => entry.count === 0)).toBe(true);
  });

  it("counts shipments by status", async () => {
    await createShipment(input(), ACTOR);
    const second = await createShipment(input(), ACTOR);
    await updateShipmentStatus(second.id, { status: "delivered" }, ACTOR);

    const metrics = await getShipmentMetrics();
    const byStatus = Object.fromEntries(
      metrics.byStatus.map((entry) => [entry.status, entry.count]),
    );

    expect(metrics.total).toBe(2);
    expect(byStatus.order_confirmed).toBe(1);
    expect(byStatus.delivered).toBe(1);
  });

  it("counts shipments by transport type, zero-filling the unused modes", async () => {
    await createShipment(input(), ACTOR);
    await createShipment(
      input({ details: { transportType: "sea", weightKg: "40", shipDate: "2026-03-12" } }),
      ACTOR,
    );

    const metrics = await getShipmentMetrics();
    const byTransport = Object.fromEntries(
      metrics.byTransport.map((entry) => [entry.transportType, entry.count]),
    );

    expect(byTransport.air).toBe(1);
    expect(byTransport.sea).toBe(1);
    expect(byTransport.road).toBe(0);
    expect(byTransport.rail).toBe(0);
  });

  describe("the customs hold figures", () => {
    it("sums the amounts levied across held consignments", async () => {
      const first = await createShipment(input(), ACTOR);
      const second = await createShipment(input(), ACTOR);
      await updateShipmentStatus(first.id, { status: "customs_held", amount: 120.5 }, ACTOR);
      await updateShipmentStatus(second.id, { status: "customs_held", amount: 80 }, ACTOR);

      const metrics = await getShipmentMetrics();

      expect(metrics.heldCount).toBe(2);
      expect(metrics.heldAmount).toBeCloseTo(200.5);
    });

    it("counts a hold with no amount recorded, and sums it as nothing", async () => {
      const shipment = await createShipment(input(), ACTOR);
      await updateShipmentStatus(shipment.id, { status: "customs_held" }, ACTOR);

      const metrics = await getShipmentMetrics();

      expect(metrics.heldCount).toBe(1);
      expect(metrics.heldAmount).toBe(0);
    });
  });

  describe("the overdue count", () => {
    it("counts a consignment past its expected delivery", async () => {
      await createShipment(
        input({
          details: {
            transportType: "air",
            weightKg: "5",
            shipDate: "2020-01-01",
            expectedDelivery: "2020-02-01",
          },
        }),
        ACTOR,
      );

      expect((await getShipmentMetrics()).overdueCount).toBe(1);
    });

    it("excludes one that was delivered, however late", async () => {
      const shipment = await createShipment(
        input({
          details: {
            transportType: "air",
            weightKg: "5",
            shipDate: "2020-01-01",
            expectedDelivery: "2020-02-01",
          },
        }),
        ACTOR,
      );
      await updateShipmentStatus(shipment.id, { status: "delivered" }, ACTOR);

      expect((await getShipmentMetrics()).overdueCount).toBe(0);
    });

    it("excludes one with no expected delivery at all", async () => {
      await createShipment(input(), ACTOR);

      expect((await getShipmentMetrics()).overdueCount).toBe(0);
    });

    it("excludes one still inside its window", async () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await createShipment(
        input({
          details: {
            transportType: "air",
            weightKg: "5",
            shipDate: "2026-03-12",
            expectedDelivery: future.toISOString().slice(0, 10),
          },
        }),
        ACTOR,
      );

      expect((await getShipmentMetrics()).overdueCount).toBe(0);
    });
  });

  describe("the trend series", () => {
    it("is zero-filled to exactly one point per day in the window", async () => {
      const metrics = await getShipmentMetrics();

      expect(metrics.createdDaily).toHaveLength(TREND_DAYS);
      expect(metrics.createdDaily.every((point) => point.count === 0)).toBe(true);
    });

    it("is ordered oldest first, one UTC midnight apart", async () => {
      const series = (await getShipmentMetrics()).createdDaily;

      for (const point of series) expect(point.date.endsWith("T00:00:00.000Z")).toBe(true);

      const stamps = series.map((point) => Date.parse(point.date));
      const ascending = [...stamps].sort((a, b) => a - b);
      expect(stamps).toEqual(ascending);
    });

    it("counts today's shipments in the final bucket", async () => {
      await createShipment(input(), ACTOR);
      await createShipment(input(), ACTOR);

      const series = (await getShipmentMetrics()).createdDaily;

      expect(series.at(-1)?.count).toBe(2);
      // Everything else stays zero rather than smearing across the window.
      expect(series.slice(0, -1).every((point) => point.count === 0)).toBe(true);
    });

    it("excludes shipments created before the window", async () => {
      await createShipment(input(), ACTOR);
      await db
        .collection("shipments")
        .updateMany({}, { $set: { createdAt: new Date("2020-01-01T00:00:00.000Z") } });

      const metrics = await getShipmentMetrics();

      // Still counted in the totals — only the trend window excludes it.
      expect(metrics.total).toBe(1);
      expect(metrics.createdDaily.every((point) => point.count === 0)).toBe(true);
    });
  });
});

describe("getAdminMetrics", () => {
  it("returns zeros for conversations when there are none", async () => {
    const metrics = await getAdminMetrics();

    expect(metrics.conversations).toEqual({ open: 0, unread: 0 });
  });

  it("counts open conversations and those with unread messages separately", async () => {
    // Open, with an unanswered message.
    const noisy = await startChat();
    await appendVisitorMessage(noisy, { body: "Where is my parcel?" });

    // Open, nothing said yet.
    await startChat();

    // Closed, but still carrying an unread message.
    const closed = await startChat();
    await appendVisitorMessage(closed, { body: "One more thing" });
    await closeConversation(await idOf(closed), ACTOR);

    const metrics = await getAdminMetrics();

    expect(metrics.conversations.open).toBe(2);
    // Unread is deliberately NOT scoped to open: a closed thread with an
    // unanswered message still needs the admin's eyes.
    expect(metrics.conversations.unread).toBe(2);
  });

  it("carries the shipment half through unchanged", async () => {
    await createShipment(input(), ACTOR);

    const metrics = await getAdminMetrics();

    expect(metrics.shipments.total).toBe(1);
  });
});
