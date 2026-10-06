import { describe, expect, it } from "vitest";

import { COUNTRIES, COUNTRY_CODES, COUNTRY_NAMES, flagEmoji, isCountryCode } from "@/lib/countries";

/**
 * The country list is generated and committed, so these guard the generation
 * having gone wrong — a truncated list, a duplicate, a stray non-country code —
 * rather than logic that changes.
 */

describe("COUNTRY_CODES", () => {
  it("holds the 249 officially assigned ISO 3166-1 codes", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(249);
  });

  it("is every code two upper-case letters", () => {
    for (const code of COUNTRY_CODES) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it("excludes deprecated aliases and non-country codes", () => {
    // UK/AN/YU/ZR are superseded; EU/QO/ZZ/XK are not countries. Including any
    // would put two entries for one place in the dropdown, or one with no flag.
    for (const code of ["UK", "AN", "YU", "ZR", "EU", "QO", "ZZ", "XK"]) {
      expect(COUNTRY_CODES).not.toContain(code);
    }
  });

  it("names every code, with no duplicate names", () => {
    const names = COUNTRY_CODES.map((code) => COUNTRY_NAMES[code]);

    for (const name of names) expect(name.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it("is already sorted by name, so no sort is needed at render time", () => {
    const names = COUNTRIES.map((country) => country.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });
});

describe("flagEmoji", () => {
  it("maps a code to its regional indicator pair", () => {
    expect(flagEmoji("NG")).toBe("\u{1F1F3}\u{1F1EC}");
    expect(flagEmoji("GH")).toBe("\u{1F1EC}\u{1F1ED}");
  });

  it("produces two code points for every country", () => {
    for (const code of COUNTRY_CODES) {
      expect([...flagEmoji(code)]).toHaveLength(2);
    }
  });
});

describe("isCountryCode", () => {
  it("accepts a real code and rejects everything else", () => {
    expect(isCountryCode("NG")).toBe(true);
    // The cases that actually occur: a shipment written before the field
    // existed, and a value left over from the old free-text location.
    expect(isCountryCode(undefined)).toBe(false);
    expect(isCountryCode("")).toBe(false);
    expect(isCountryCode("Lagos, NG")).toBe(false);
  });

  it("is not fooled by inherited Object properties", () => {
    // COUNTRY_NAMES is an object literal, so `"toString" in it` is true — the
    // guard must not let that through as a country.
    expect(isCountryCode("toString")).toBe(false);
    expect(isCountryCode("constructor")).toBe(false);
  });
});
