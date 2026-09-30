import type mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createShipment,
  deleteShipment,
  generateTrackingCode,
  getShipmentById,
  listShipments,
  updateShipment,
  updateShipmentStatus,
} from "@/services/shipment.service";
import { TRACKING_CODE_PATTERN, shipmentCreateSchema } from "@/validations/shipment";

import { openTestConnection } from "../helpers/db.ts";

/**
 * Covers the rules that live in the service rather than in the schema: tracking
 * code allocation, the append-only status history, filtering, and the null (not
 * throw) contract for a bad id.
 */

const ACTOR = "admin-user-id";

let db: mongoose.mongo.Db;
let close: () => Promise<void>;

function input(overrides: Record<string, unknown> = {}) {
  return shipmentCreateSchema.parse({
    sender: { name: "Ada Freight", location: "Lagos, NG" },
    receiver: { name: "Grace Imports", location: "Accra, GH" },
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
});

describe("generateTrackingCode", () => {
  it("produces codes matching the published pattern", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateTrackingCode()).toMatch(TRACKING_CODE_PATTERN);
    }
  });

  it("does not repeat across a large sample", () => {
    const codes = new Set(Array.from({ length: 500 }, generateTrackingCode));
    expect(codes.size).toBe(500);
  });
});

describe("createShipment", () => {
  it("allocates a tracking code and seeds the status history", async () => {
    const created = await createShipment(input(), ACTOR);

    expect(created.trackingCode).toMatch(TRACKING_CODE_PATTERN);
    expect(created.status).toBe("order_confirmed");

    // The creating status is itself the first history entry, so the timeline is
    // complete from the moment the record exists.
    expect(created.statusHistory).toHaveLength(1);
    expect(created.statusHistory[0]).toMatchObject({
      status: "order_confirmed",
      changedBy: ACTOR,
    });
  });

  it("gives each shipment a distinct code", async () => {
    const first = await createShipment(input(), ACTOR);
    const second = await createShipment(input(), ACTOR);

    expect(first.trackingCode).not.toBe(second.trackingCode);
  });

  it("honours a non-default starting status", async () => {
    const created = await createShipment(input({ status: "on_the_way" }), ACTOR);

    expect(created.status).toBe("on_the_way");
    expect(created.statusHistory[0]?.status).toBe("on_the_way");
  });

  it("returns ISO strings and no raw document internals", async () => {
    const created = await createShipment(input(), ACTOR);

    expect(typeof created.shipDate).toBe("string");
    expect(typeof created.createdAt).toBe("string");
    // The public/private boundary: no _id or __v leaks through the DTO.
    expect(Object.keys(created)).not.toContain("_id");
    expect(Object.keys(created)).not.toContain("__v");
  });
});

describe("updateShipmentStatus", () => {
  it("appends to the history rather than overwriting it", async () => {
    const created = await createShipment(input(), ACTOR);

    await updateShipmentStatus(created.id, { status: "picked_by_courier" }, ACTOR);
    const updated = await updateShipmentStatus(
      created.id,
      { status: "customs_held", note: "Awaiting paperwork" },
      ACTOR,
    );

    expect(updated?.status).toBe("customs_held");
    expect(updated?.statusHistory).toHaveLength(3);
    expect(updated?.statusHistory.map((event) => event.status)).toEqual([
      "order_confirmed",
      "picked_by_courier",
      "customs_held",
    ]);
    expect(updated?.statusHistory[2]?.note).toBe("Awaiting paperwork");
  });

  it("allows moving backwards, so an operator can correct a mistake", async () => {
    const created = await createShipment(input(), ACTOR);

    await updateShipmentStatus(created.id, { status: "delivered" }, ACTOR);
    const corrected = await updateShipmentStatus(created.id, { status: "on_the_way" }, ACTOR);

    expect(corrected?.status).toBe("on_the_way");
    expect(corrected?.statusHistory).toHaveLength(3);
  });
});

describe("updateShipment", () => {
  it("changes details without touching the tracking code or status", async () => {
    const created = await createShipment(input(), ACTOR);

    const updated = await updateShipment(created.id, {
      sender: { name: "Ada Logistics", location: "Kano, NG" },
      receiver: { name: "Grace Imports", location: "Accra, GH" },
      details: { transportType: "sea", weightKg: 40, shipDate: new Date("2026-04-01") },
    });

    expect(updated?.trackingCode).toBe(created.trackingCode);
    expect(updated?.status).toBe(created.status);
    expect(updated?.sender.name).toBe("Ada Logistics");
    expect(updated?.transportType).toBe("sea");
  });
});

describe("lookups with a bad id", () => {
  it("returns null or false instead of throwing a CastError", async () => {
    // A malformed ObjectId is what a hand-edited URL produces; it must 404, not 500.
    await expect(getShipmentById("not-an-object-id")).resolves.toBeNull();
    await expect(updateShipmentStatus("nope", { status: "delivered" }, ACTOR)).resolves.toBeNull();
    await expect(deleteShipment("nope")).resolves.toBe(false);
  });

  it("returns null for a well-formed id that does not exist", async () => {
    await expect(getShipmentById("64b7f9c2e1a2b3c4d5e6f7a8")).resolves.toBeNull();
  });
});

describe("deleteShipment", () => {
  it("removes the record and reports whether it did", async () => {
    const created = await createShipment(input(), ACTOR);

    await expect(deleteShipment(created.id)).resolves.toBe(true);
    await expect(getShipmentById(created.id)).resolves.toBeNull();
    // Already gone: the caller needs to distinguish this from a success.
    await expect(deleteShipment(created.id)).resolves.toBe(false);
  });
});

describe("listShipments", () => {
  beforeEach(async () => {
    await createShipment(input({ sender: { name: "Alpha Co", location: "Lagos, NG" } }), ACTOR);
    await createShipment(
      input({
        sender: { name: "Beta Co", location: "Cairo, EG" },
        receiver: { name: "Zeta Ltd", location: "Rome, IT" },
        status: "delivered",
      }),
      ACTOR,
    );
  });

  it("returns newest first with pagination metadata", async () => {
    const page = await listShipments({ page: 1, q: undefined, status: undefined });

    expect(page.total).toBe(2);
    expect(page.pageCount).toBe(1);
    expect(page.items).toHaveLength(2);
    expect(page.items[0]?.senderName).toBe("Beta Co");
  });

  it("filters by status", async () => {
    const page = await listShipments({ page: 1, q: undefined, status: "delivered" });

    expect(page.total).toBe(1);
    expect(page.items[0]?.senderName).toBe("Beta Co");
  });

  it("searches sender, receiver and tracking code case-insensitively", async () => {
    const bySender = await listShipments({ page: 1, q: "alpha", status: undefined });
    expect(bySender.items[0]?.senderName).toBe("Alpha Co");

    const byReceiver = await listShipments({ page: 1, q: "zeta", status: undefined });
    expect(byReceiver.items[0]?.receiverName).toBe("Zeta Ltd");

    const code = bySender.items[0]?.trackingCode ?? "";
    const byCode = await listShipments({ page: 1, q: code, status: undefined });
    expect(byCode.total).toBe(1);
  });

  it("treats regex metacharacters in the search term as literal text", async () => {
    // Unescaped, ".*" would match every shipment.
    const page = await listShipments({ page: 1, q: ".*", status: undefined });

    expect(page.total).toBe(0);
  });

  it("returns an empty page past the end rather than failing", async () => {
    const page = await listShipments({ page: 99, q: undefined, status: undefined });

    expect(page.items).toHaveLength(0);
    expect(page.total).toBe(2);
  });
});
