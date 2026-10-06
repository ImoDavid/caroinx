import { describe, expect, it } from "vitest";

import {
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
  SHIPMENT_STATUSES,
  TRACKING_CODE_ALPHABET,
  shipmentCreateSchema,
  shipmentListQuerySchema,
  shipmentPhotoSchema,
  shipmentStatusUpdateSchema,
  trackingCodeSchema,
} from "@/validations/shipment";

const VALID = {
  sender: { name: "Ada Freight", country: "NG", location: "Lagos", phone: "+2348000000" },
  receiver: {
    name: "Grace Imports",
    country: "GH",
    location: "Accra",
    email: "grace@example.com",
  },
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

  it("rejects an empty submission", () => {
    expect(trackingCodeSchema.safeParse("").success).toBe(false);
    expect(trackingCodeSchema.safeParse("   ").success).toBe(false);
  });

  it("strips whitespace typed inside the code, not just around it", () => {
    // A customer reading a code aloud from a label groups the characters.
    expect(trackingCodeSchema.parse("TGR 8F3K 2QD7")).toBe("TGR-8F3K2QD7");
  });
});

describe("expectedDelivery", () => {
  it("coerces a date input value", () => {
    const parsed = shipmentCreateSchema.parse({
      ...VALID,
      details: { ...VALID.details, expectedDelivery: "2026-05-01" },
    });

    expect(parsed.details.expectedDelivery).toBeInstanceOf(Date);
    expect(parsed.details.expectedDelivery?.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("treats a blank field as absent", () => {
    // `z.coerce.date("")` is an Invalid Date rather than a failure, so blank has
    // to become undefined BEFORE coercion. What matters downstream is the VALUE:
    // Mongoose drops an undefined path on create, and updateShipment tests it
    // for truthiness to decide between $set and $unset.
    const blank = shipmentCreateSchema.parse({
      ...VALID,
      details: { ...VALID.details, expectedDelivery: "   " },
    });

    expect(blank.details.expectedDelivery).toBeUndefined();
  });

  it("keeps the key genuinely optional, so no caller must pass undefined", () => {
    // Rule 22: `.optional()` has to be OUTERMOST or the ZodPipe leaves a
    // REQUIRED key, and every caller building a details object has to write
    // `expectedDelivery: undefined` to satisfy the type.
    const omitted = shipmentCreateSchema.parse(VALID);

    expect(Object.hasOwn(omitted.details, "expectedDelivery")).toBe(false);
  });

  it("rejects a date that is not a date", () => {
    // z.coerce.date("") is an Invalid Date rather than a failure, which is why
    // blank is turned into undefined BEFORE coercion — but real junk must fail.
    const result = shipmentCreateSchema.safeParse({
      ...VALID,
      details: { ...VALID.details, expectedDelivery: "not-a-date" },
    });

    expect(result.success).toBe(false);
  });

  it("does not make the shipping date optional by association", () => {
    const result = shipmentCreateSchema.safeParse({
      ...VALID,
      details: { ...VALID.details, shipDate: "" },
    });

    expect(result.success).toBe(false);
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

  it("accepts an amount while held at customs and coerces it from the form string", () => {
    const parsed = shipmentStatusUpdateSchema.parse({ status: "customs_held", amount: "1250.50" });

    expect(parsed.amount).toBe(1250.5);
  });

  it("treats an empty amount as absent, which is how a charge is cleared", () => {
    expect(shipmentStatusUpdateSchema.parse({ status: "customs_held", amount: "" }).amount).toBe(
      undefined,
    );
    expect(shipmentStatusUpdateSchema.parse({ status: "customs_held" }).amount).toBe(undefined);
  });

  it("accepts zero, which is a real charge and not the same as none", () => {
    expect(shipmentStatusUpdateSchema.parse({ status: "customs_held", amount: "0" }).amount).toBe(
      0,
    );
  });

  it("rejects an amount on any other status rather than dropping it", () => {
    for (const status of SHIPMENT_STATUSES.filter((s) => s !== "customs_held")) {
      const result = shipmentStatusUpdateSchema.safeParse({ status, amount: "100" });

      expect(result.success).toBe(false);
      // Reported against the amount field so the form can show it in place.
      expect(result.error?.issues[0]?.path).toEqual(["amount"]);
    }
  });

  it("still allows other statuses when no amount is supplied", () => {
    for (const status of SHIPMENT_STATUSES) {
      expect(shipmentStatusUpdateSchema.safeParse({ status, amount: "" }).success).toBe(true);
    }
  });

  it("rejects a negative or non-numeric amount", () => {
    expect(
      shipmentStatusUpdateSchema.safeParse({ status: "customs_held", amount: "-1" }).success,
    ).toBe(false);
    expect(
      shipmentStatusUpdateSchema.safeParse({ status: "customs_held", amount: "abc" }).success,
    ).toBe(false);
  });
});

describe("country", () => {
  it("accepts a valid ISO code on both parties", () => {
    const parsed = shipmentCreateSchema.parse(VALID);

    expect(parsed.sender.country).toBe("NG");
    expect(parsed.receiver.country).toBe("GH");
  });

  it("rejects a country that is not an ISO 3166-1 code", () => {
    for (const country of ["", "NGA", "ng", "XX", "UK"]) {
      const result = shipmentCreateSchema.safeParse({
        ...VALID,
        sender: { ...VALID.sender, country },
      });

      // "UK" and "ng" are the interesting ones: a plausible-looking code that is
      // not the assigned one (GB), and the right code in the wrong case.
      expect(result.success, `expected ${JSON.stringify(country)} to be rejected`).toBe(false);
    }
  });

  it("keeps the city line as its own required field", () => {
    const result = shipmentCreateSchema.safeParse({
      ...VALID,
      sender: { ...VALID.sender, location: "" },
    });

    expect(result.success).toBe(false);
  });
});

describe("shipmentPhotoSchema", () => {
  it("accepts every advertised image type", () => {
    for (const type of PHOTO_MIME_TYPES) {
      expect(shipmentPhotoSchema.safeParse({ type, size: 1 }).success).toBe(true);
    }
  });

  it("accepts a file of exactly the maximum size but not one byte more", () => {
    expect(
      shipmentPhotoSchema.safeParse({ type: "image/jpeg", size: PHOTO_MAX_BYTES }).success,
    ).toBe(true);
    expect(
      shipmentPhotoSchema.safeParse({ type: "image/jpeg", size: PHOTO_MAX_BYTES + 1 }).success,
    ).toBe(false);
  });

  it("rejects image types Cloudinary would take but the form does not advertise", () => {
    expect(shipmentPhotoSchema.safeParse({ type: "image/gif", size: 1 }).success).toBe(false);
    expect(shipmentPhotoSchema.safeParse({ type: "application/pdf", size: 1 }).success).toBe(false);
  });

  it("rejects a zero-byte file, which is what an untouched input posts", () => {
    expect(shipmentPhotoSchema.safeParse({ type: "image/png", size: 0 }).success).toBe(false);
  });

  it("reports a message the form can show for each failure", () => {
    const badType = shipmentPhotoSchema.safeParse({ type: "image/gif", size: 1 });
    const badSize = shipmentPhotoSchema.safeParse({
      type: "image/png",
      size: PHOTO_MAX_BYTES + 1,
    });

    // The action surfaces issues[0].message verbatim, so it must be human copy.
    expect(badType.error?.issues[0]?.message).toMatch(/PNG, JPEG, WebP or AVIF/);
    expect(badSize.error?.issues[0]?.message).toMatch(/larger than 4 MB/);
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
