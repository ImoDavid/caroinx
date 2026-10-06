import { describe, expect, it } from "vitest";

import { COUNTRY_COORDINATES } from "@/lib/country-coordinates";
import { COUNTRY_CODES, COUNTRY_NAMES } from "@/lib/countries";

/**
 * The coordinate table is generated and committed, so these guard the
 * generation having gone wrong — a country the source omitted, a stray key, a
 * lat/lng swapped — rather than logic that changes.
 *
 * The first test is the gate: `scripts/generate-country-coordinates.ts` refuses
 * to write a file with gaps, and this fails if one is introduced by hand.
 */

describe("COUNTRY_COORDINATES", () => {
  it("covers every country the admin form can select", () => {
    const missing = COUNTRY_CODES.filter((code) => !(code in COUNTRY_COORDINATES));
    expect(missing, `missing: ${missing.map((c) => COUNTRY_NAMES[c]).join(", ")}`).toEqual([]);
  });

  it("has no keys that are not countries", () => {
    const known = new Set<string>(COUNTRY_CODES);
    expect(Object.keys(COUNTRY_COORDINATES).filter((code) => !known.has(code))).toEqual([]);
  });

  it("keeps every coordinate on the globe", () => {
    for (const code of COUNTRY_CODES) {
      const { lat, lng } = COUNTRY_COORDINATES[code];
      expect(Number.isFinite(lat), code).toBe(true);
      expect(Number.isFinite(lng), code).toBe(true);
      expect(lat, code).toBeGreaterThanOrEqual(-90);
      expect(lat, code).toBeLessThanOrEqual(90);
      expect(lng, code).toBeGreaterThanOrEqual(-180);
      expect(lng, code).toBeLessThanOrEqual(180);
    }
  });

  it("places a spread of countries in the right hemispheres", () => {
    // Cheap protection against a lat/lng swap, which would otherwise look
    // plausible right up until the map renders.
    expect(COUNTRY_COORDINATES.NG.lat).toBeGreaterThan(0);
    expect(COUNTRY_COORDINATES.NG.lng).toBeGreaterThan(0);
    expect(COUNTRY_COORDINATES.US.lng).toBeLessThan(-60);
    expect(COUNTRY_COORDINATES.NZ.lat).toBeLessThan(0);
    expect(COUNTRY_COORDINATES.NZ.lng).toBeGreaterThan(160);
    expect(COUNTRY_COORDINATES.GB.lat).toBeGreaterThan(45);
  });

  it("uses label anchors rather than centroids where the two differ", () => {
    // Norway's polygon centroid falls inside Sweden and Indonesia's falls in the
    // Java Sea. These assert the generator read LABEL_X/LABEL_Y, not a centroid.
    expect(COUNTRY_COORDINATES.NO.lng).toBeLessThan(13);
    expect(COUNTRY_COORDINATES.ID.lng).toBeLessThan(110);
  });
});
