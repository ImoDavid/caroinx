import { ObjectId } from "mongodb";
import type mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createShipment,
  deleteShipment,
  generateTrackingCode,
  getShipmentById,
  getShipmentByTrackingCode,
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

/** What lib/cloudinary.ts returns after a successful upload. No network needed:
 *  the service never talks to Cloudinary, which is why it lives in lib/. */
const PHOTO = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/sendly/shipments/abc.jpg",
  publicId: "sendly/shipments/abc",
  width: 1600,
  height: 1200,
};

let db: mongoose.mongo.Db;
let close: () => Promise<void>;

function input(overrides: Record<string, unknown> = {}) {
  return shipmentCreateSchema.parse({
    sender: { name: "Ada Freight", country: "NG", location: "Lagos" },
    receiver: { name: "Grace Imports", country: "GH", location: "Accra" },
    details: { transportType: "air", weightKg: "12.5", shipDate: "2026-03-12" },
    ...overrides,
  });
}

/** The editable fields, already parsed — updateShipment takes output values. */
function editable() {
  return {
    sender: { name: "Ada Logistics", country: "NG" as const, location: "Kano" },
    receiver: { name: "Grace Imports", country: "GH" as const, location: "Accra" },
    details: {
      transportType: "sea" as const,
      weightKg: 40,
      shipDate: new Date("2026-04-01"),
    },
  };
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

  it("persists the sender and receiver countries", async () => {
    const created = await createShipment(input(), ACTOR);

    expect(created.sender.country).toBe("NG");
    expect(created.receiver.country).toBe("GH");

    const stored = await db.collection("shipments").findOne({ trackingCode: created.trackingCode });
    expect(stored?.sender).toMatchObject({ country: "NG", location: "Lagos" });
    expect(stored?.receiver).toMatchObject({ country: "GH", location: "Accra" });
  });

  it("persists a photo and returns it on the detail", async () => {
    const created = await createShipment(input(), ACTOR, PHOTO);

    expect(created.photo).toEqual(PHOTO);

    // Round-trips through Mongo, not just through the in-memory document.
    const stored = await db.collection("shipments").findOne({ trackingCode: created.trackingCode });
    expect(stored?.photo).toMatchObject({ url: PHOTO.url, publicId: PHOTO.publicId });

    const fetched = await getShipmentById(created.id);
    expect(fetched?.photo).toEqual(PHOTO);
  });

  it("writes no photo subdocument at all when none is supplied", async () => {
    const created = await createShipment(input(), ACTOR);

    expect(created.photo).toBeUndefined();

    // Mongoose must DROP the undefined path rather than store an empty object,
    // or every pre-existing shipment would gain a meaningless photo.
    const stored = await db.collection("shipments").findOne({ trackingCode: created.trackingCode });
    expect(stored).not.toHaveProperty("photo");
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

  it("records a customs charge when the shipment is held", async () => {
    const created = await createShipment(input(), ACTOR);

    const held = await updateShipmentStatus(
      created.id,
      { status: "customs_held", amount: 1250.5 },
      ACTOR,
    );

    expect(held?.amount).toBe(1250.5);
  });

  it("keeps the charge on record after the shipment is released", async () => {
    const created = await createShipment(input(), ACTOR);
    await updateShipmentStatus(created.id, { status: "customs_held", amount: 400 }, ACTOR);

    // Moving on must not destroy the only record of what customs levied.
    const released = await updateShipmentStatus(created.id, { status: "on_the_way" }, ACTOR);

    expect(released?.amount).toBe(400);
  });

  it("clears the charge when held again with an empty amount", async () => {
    const created = await createShipment(input(), ACTOR);
    await updateShipmentStatus(created.id, { status: "customs_held", amount: 400 }, ACTOR);

    // The form pre-fills the current figure, so an empty box means "remove it" —
    // the only way to correct a charge entered by mistake.
    const corrected = await updateShipmentStatus(created.id, { status: "customs_held" }, ACTOR);

    expect(corrected?.amount).toBeUndefined();
    const stored = await db.collection("shipments").findOne({ _id: new ObjectId(created.id) });
    expect(stored).not.toHaveProperty("amount");
  });

  it("replaces a charge with a corrected one", async () => {
    const created = await createShipment(input(), ACTOR);
    await updateShipmentStatus(created.id, { status: "customs_held", amount: 400 }, ACTOR);

    const corrected = await updateShipmentStatus(
      created.id,
      { status: "customs_held", amount: 550 },
      ACTOR,
    );

    expect(corrected?.amount).toBe(550);
  });

  it("stores a zero charge, which is not the same as no charge", async () => {
    const created = await createShipment(input(), ACTOR);

    const held = await updateShipmentStatus(
      created.id,
      { status: "customs_held", amount: 0 },
      ACTOR,
    );

    expect(held?.amount).toBe(0);
  });
});

describe("updateShipment", () => {
  it("changes details without touching the tracking code or status", async () => {
    const created = await createShipment(input(), ACTOR);

    const updated = await updateShipment(created.id, editable());

    expect(updated?.trackingCode).toBe(created.trackingCode);
    expect(updated?.status).toBe(created.status);
    expect(updated?.sender.name).toBe("Ada Logistics");
    expect(updated?.transportType).toBe("sea");
  });

  it("adds a photo to a shipment that has none", async () => {
    const created = await createShipment(input(), ACTOR);
    expect(created.photo).toBeUndefined();

    const updated = await updateShipment(created.id, editable(), PHOTO);

    expect(updated?.photo).toEqual(PHOTO);
  });

  it("refuses to replace a photo that is already there", async () => {
    const created = await createShipment(input(), ACTOR, PHOTO);

    const updated = await updateShipment(created.id, editable(), {
      url: "https://res.cloudinary.com/demo/image/upload/v1/sendly/shipments/other.jpg",
      publicId: "sendly/shipments/other",
      width: 100,
      height: 100,
    });

    // The original survives, and the text fields still save: the guard is a
    // silent no-op, not a failed update.
    expect(updated?.photo).toEqual(PHOTO);
    expect(updated?.sender.name).toBe("Ada Logistics");
  });

  it("leaves an existing photo alone when no new one is supplied", async () => {
    const created = await createShipment(input(), ACTOR, PHOTO);

    const updated = await updateShipment(created.id, editable());

    expect(updated?.photo).toEqual(PHOTO);
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
    // These overrides REPLACE the whole party object, so each must carry a
    // country of its own — the schema requires one.
    await createShipment(
      input({ sender: { name: "Alpha Co", country: "NG", location: "Lagos" } }),
      ACTOR,
    );
    await createShipment(
      input({
        sender: { name: "Beta Co", country: "EG", location: "Cairo" },
        receiver: { name: "Zeta Ltd", country: "IT", location: "Rome" },
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

describe("expectedDelivery", () => {
  it("round-trips through create", async () => {
    const created = await createShipment(
      input({
        details: {
          transportType: "air",
          weightKg: "12.5",
          shipDate: "2026-03-12",
          expectedDelivery: "2026-03-20",
        },
      }),
      ACTOR,
    );

    expect(created.expectedDelivery).toBe("2026-03-20T00:00:00.000Z");
  });

  it("writes no field at all when the date is left blank", async () => {
    const created = await createShipment(input(), ACTOR);

    expect(created.expectedDelivery).toBeUndefined();
    const stored = await db.collection("shipments").findOne({ trackingCode: created.trackingCode });
    expect(stored).not.toHaveProperty("expectedDelivery");
  });

  it("is CLEARED by an update with a blank date", async () => {
    // Mongoose strips undefined from $set, so without an explicit $unset a date
    // could be set but never removed. This is the regression test for that.
    const created = await createShipment(
      input({
        details: {
          transportType: "air",
          weightKg: "12.5",
          shipDate: "2026-03-12",
          expectedDelivery: "2026-03-20",
        },
      }),
      ACTOR,
    );
    expect(created.expectedDelivery).toBeDefined();

    const cleared = await updateShipment(created.id, editable());

    expect(cleared?.expectedDelivery).toBeUndefined();
    const stored = await db.collection("shipments").findOne({ _id: new ObjectId(created.id) });
    expect(stored).not.toHaveProperty("expectedDelivery");
  });

  it("is replaced by an update carrying a new date", async () => {
    const created = await createShipment(input(), ACTOR);

    const updated = await updateShipment(created.id, {
      ...editable(),
      details: { ...editable().details, expectedDelivery: new Date("2026-05-01") },
    });

    expect(updated?.expectedDelivery).toBe("2026-05-01T00:00:00.000Z");
  });
});

describe("getShipmentByTrackingCode", () => {
  it("finds a shipment by its exact code", async () => {
    const created = await createShipment(input(), ACTOR);

    const found = await getShipmentByTrackingCode(created.trackingCode);

    expect(found?.trackingCode).toBe(created.trackingCode);
    expect(found?.status).toBe("order_confirmed");
  });

  it("normalises what a customer is likely to type", async () => {
    const created = await createShipment(input(), ACTOR);
    const messy = `  ${created.trackingCode.replace("-", "").toLowerCase()} `;

    const found = await getShipmentByTrackingCode(messy);

    expect(found?.trackingCode).toBe(created.trackingCode);
  });

  it("returns null for a well-formed code that does not exist", async () => {
    expect(await getShipmentByTrackingCode("TGR-00000000")).toBeNull();
  });

  it("returns null for a malformed code without reaching the database", async () => {
    // The only rate limiting this public route has: garbage costs a regex.
    expect(await getShipmentByTrackingCode("XYZ-1")).toBeNull();
    expect(await getShipmentByTrackingCode("")).toBeNull();
  });

  it("never exposes the document id or the admin who changed a status", async () => {
    const created = await createShipment(input(), ACTOR);
    await updateShipmentStatus(created.id, { status: "on_the_way", note: "Left Lagos" }, ACTOR);

    const found = await getShipmentByTrackingCode(created.trackingCode);

    expect(Object.hasOwn(found!, "id")).toBe(false);
    expect(found?.history.every((event) => !Object.hasOwn(event, "changedBy"))).toBe(true);
    // The note IS public: rule 24 says the history is what the public timeline
    // renders, so operators write these knowing a customer reads them.
    expect(found?.history.at(-1)?.note).toBe("Left Lagos");
  });

  it("DOES expose both parties' contact details, by deliberate decision", async () => {
    // This is not a leak to be "fixed" — see CLAUDE.md gap 15. If this test is
    // ever failing, the product decision changed and the gap should change too.
    const created = await createShipment(
      input({
        sender: { name: "Ada Freight", country: "NG", location: "Lagos", phone: "+2348000000" },
        receiver: {
          name: "Grace Imports",
          country: "GH",
          location: "Accra",
          phone: "+233200000",
          email: "grace@example.com",
        },
      }),
      ACTOR,
    );

    const found = await getShipmentByTrackingCode(created.trackingCode);

    expect(found?.sender.phone).toBe("+2348000000");
    expect(found?.receiver.phone).toBe("+233200000");
    expect(found?.receiver.email).toBe("grace@example.com");
  });

  it("reports the last STATUS change as the update time, not a document timestamp", async () => {
    const created = await createShipment(input(), ACTOR);
    const moved = await updateShipmentStatus(created.id, { status: "on_the_way" }, ACTOR);

    const found = await getShipmentByTrackingCode(created.trackingCode);

    expect(found?.lastUpdatedAt).toBe(moved?.statusHistory.at(-1)?.changedAt);
  });
});
