import { describe, expect, it } from "vitest";

import {
  SHIPMENT_STATUSES,
  TRACKING_CODE_ALPHABET,
  shipmentCreateSchema,
  shipmentListQuerySchema,
  shipmentStatusUpdateSchema,
  trackingCodeSchema,
} from "@/validations/shipment";

const VALID = {
  sender: { name: "Ada Freight", location: "Lagos, NG", phone: "+2348000000" },
  receiver: { name: "Grace Imports", location: "Accra, GH", email: "grace@example.com" },
  details: { transportType: "air", weightKg: "12.5", shipDate: "2026-03-12" },
};

describe("shipmentCreateSchema", () => {
  it("accepts a complete payload and coerces weight and date", () => {
    const parsed = shipmentCreateSchema.parse(VALID);

    expect(parsed.details.weightKg).toBe(12.5);
    expect(parsed.details.shipDate).toBeInstanceOf(Date);
    // Not supplied, so the default applies.
    expect(parsed.status).toBe("order_confirmed");
  });

  it("treats an untouched optional field as absent rather than an empty string", () => {
    const parsed = shipmentCreateSchema.parse({
      ...VALID,
      sender: { ...VALID.sender, phone: "" },
      receiver: { ...VALID.receiver, phone: "", email: "" },
    });

    expect(parsed.sender.phone).toBeUndefined();
    expect(parsed.receiver.phone).toBeUndefined();
    expect(parsed.receiver.email).toBeUndefined();
  });

  it("requires both parties and rejects a non-positive weight", () => {
    const missing = shipmentCreateSchema.safeParse({
      ...VALID,
      sender: { name: "", location: "" },
    });
    expect(missing.success).toBe(false);

    const zeroWeight = shipmentCreateSchema.safeParse({
      ...VALID,
      details: { ...VALID.details, weightKg: "0" },
    });
    expect(zeroWeight.success).toBe(false);
  });

  it("rejects an unknown transport type or status", () => {
    expect(
      shipmentCreateSchema.safeParse({
        ...VALID,
        details: { ...VALID.details, transportType: "teleport" },
      }).success,
    ).toBe(false);

    expect(shipmentCreateSchema.safeParse({ ...VALID, status: "lost" }).success).toBe(false);
  });

  it("rejects a malformed receiver email", () => {
    const result = shipmentCreateSchema.safeParse({
      ...VALID,
      receiver: { ...VALID.receiver, email: "not-an-email" },
    });
    expect(result.success).toBe(false);
  });
});

describe("trackingCodeSchema", () => {
  it("normalises what a customer is likely to type", () => {
    expect(trackingCodeSchema.parse("  tgr-8f3k2qd7 ")).toBe("TGR-8F3K2QD7");
    // A missing hyphen is the most common transcription slip.
    expect(trackingCodeSchema.parse("TGR8F3K2QD7")).toBe("TGR-8F3K2QD7");
  });

  it("rejects codes using the excluded ambiguous letters", () => {
    for (const letter of ["I", "L", "O", "U"]) {
      expect(TRACKING_CODE_ALPHABET.includes(letter)).toBe(false);
      expect(trackingCodeSchema.safeParse(`TGR-${letter.repeat(8)}`).success).toBe(false);
    }
  });

  it("rejects wrong lengths and foreign prefixes", () => {
    expect(trackingCodeSchema.safeParse("TGR-123").success).toBe(false);
    expect(trackingCodeSchema.safeParse("XYZ-8F3K2QD7").success).toBe(false);
  });
});

describe("shipmentStatusUpdateSchema", () => {
  it("accepts every defined status", () => {
    for (const status of SHIPMENT_STATUSES) {
      expect(shipmentStatusUpdateSchema.parse({ status }).status).toBe(status);
    }
  });

  it("rejects an undefined status", () => {
    expect(shipmentStatusUpdateSchema.safeParse({ status: "in_orbit" }).success).toBe(false);
  });
});

describe("shipmentListQuerySchema", () => {
  it("falls back to safe defaults instead of throwing on hostile input", () => {
    // These arrive straight from a hand-edited query string.
    expect(shipmentListQuerySchema.parse({ page: "-4" }).page).toBe(1);
    expect(shipmentListQuerySchema.parse({ page: "not-a-number" }).page).toBe(1);
    expect(shipmentListQuerySchema.parse({ status: "bogus" }).status).toBeUndefined();
    expect(shipmentListQuerySchema.parse({ q: "" }).q).toBeUndefined();
  });

  it("keeps a legitimate query", () => {
    const parsed = shipmentListQuerySchema.parse({ q: " lagos ", status: "delivered", page: "3" });

    expect(parsed).toEqual({ q: "lagos", status: "delivered", page: 3 });
  });
});
