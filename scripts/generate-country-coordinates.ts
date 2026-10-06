/**
 * Generates `src/lib/country-coordinates.ts` — one map pin per ISO 3166-1
 * country, for the public tracking page's route map.
 *
 * Source: Natural Earth `ne_10m_admin_0_countries`, which is PUBLIC DOMAIN
 * (https://github.com/nvkelso/natural-earth-vector/blob/master/LICENSE.md —
 * "Everything here is public domain", no attribution required).
 *
 * The OUTPUT is committed and the script is never run at build or request time,
 * the same arrangement as `src/lib/countries.ts`. Deriving positions live would
 * mean shipping a 25 MB dataset to do arithmetic we can do once.
 *
 * Run with: npm run map:coordinates
 */
import { writeFileSync } from "node:fs";

import { COUNTRY_CODES, COUNTRY_NAMES } from "../src/lib/countries.ts";

const SOURCE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson";

const OUTPUT = "src/lib/country-coordinates.ts";

/**
 * Codes Natural Earth does not carry a usable label anchor for — uninhabited
 * territories and a few dependencies it folds into their parent. Filled by hand
 * from the coordinates on each territory's Wikipedia infobox, rounded to 1dp,
 * because the map must have a pin for every code the admin form can select.
 */
const HAND_FILLED: Record<string, { lat: number; lng: number }> = {
  BV: { lat: -54.4, lng: 3.4 }, // Bouvet Island
  HM: { lat: -53.1, lng: 73.5 }, // Heard & McDonald Islands
  UM: { lat: 19.3, lng: 166.6 }, // U.S. Outlying Islands (Wake Island)
  SJ: { lat: 78.2, lng: 16.0 }, // Svalbard & Jan Mayen (Longyearbyen)
  CX: { lat: -10.5, lng: 105.6 }, // Christmas Island
  CC: { lat: -12.2, lng: 96.9 }, // Cocos (Keeling) Islands
  NF: { lat: -29.0, lng: 167.9 }, // Norfolk Island
  TK: { lat: -9.2, lng: -171.8 }, // Tokelau
  PN: { lat: -24.4, lng: -128.3 }, // Pitcairn Islands
  GS: { lat: -54.4, lng: -36.6 }, // South Georgia & South Sandwich Islands
  TF: { lat: -49.3, lng: 69.3 }, // French Southern Territories
  IO: { lat: -7.3, lng: 72.4 }, // British Indian Ocean Territory
  AQ: { lat: -75.0, lng: 0.0 }, // Antarctica — a conventional pin, not a centroid
  MF: { lat: 18.1, lng: -63.1 }, // St. Martin
  BL: { lat: 17.9, lng: -62.8 }, // St. Barthélemy
  SX: { lat: 18.0, lng: -63.1 }, // Sint Maarten
  AX: { lat: 60.2, lng: 20.0 }, // Åland Islands
  GG: { lat: 49.5, lng: -2.6 }, // Guernsey
  JE: { lat: 49.2, lng: -2.1 }, // Jersey
  IM: { lat: 54.2, lng: -4.5 }, // Isle of Man
  MC: { lat: 43.7, lng: 7.4 }, // Monaco
  GI: { lat: 36.1, lng: -5.4 }, // Gibraltar
  VA: { lat: 41.9, lng: 12.5 }, // Vatican City
  SM: { lat: 43.9, lng: 12.5 }, // San Marino
  MT: { lat: 35.9, lng: 14.4 }, // Malta
  SG: { lat: 1.4, lng: 103.8 }, // Singapore
  TV: { lat: -8.5, lng: 179.2 }, // Tuvalu
  NR: { lat: -0.5, lng: 166.9 }, // Nauru
  MH: { lat: 7.1, lng: 171.2 }, // Marshall Islands
  PW: { lat: 7.5, lng: 134.6 }, // Palau
  MV: { lat: 3.2, lng: 73.2 }, // Maldives
  MO: { lat: 22.2, lng: 113.5 }, // Macao SAR China
  HK: { lat: 22.3, lng: 114.2 }, // Hong Kong SAR China
  BH: { lat: 26.1, lng: 50.6 }, // Bahrain
  LI: { lat: 47.2, lng: 9.5 }, // Liechtenstein
  AD: { lat: 42.5, lng: 1.5 }, // Andorra
  // Natural Earth folds the French overseas departments into France, so they
  // carry no label anchor of their own despite having their own ISO codes.
  GF: { lat: 4.0, lng: -53.0 }, // French Guiana
  GP: { lat: 16.3, lng: -61.6 }, // Guadeloupe
  MQ: { lat: 14.6, lng: -61.0 }, // Martinique
  YT: { lat: -12.8, lng: 45.2 }, // Mayotte
  RE: { lat: -21.1, lng: 55.5 }, // Réunion
  BQ: { lat: 12.2, lng: -68.3 }, // Caribbean Netherlands (Bonaire)
};

type Feature = {
  properties: Record<string, unknown>;
};

function readString(properties: Record<string, unknown>, key: string): string | undefined {
  const value = properties[key];
  return typeof value === "string" && value.trim() && value !== "-99" ? value.trim() : undefined;
}

function readNumber(properties: Record<string, unknown>, key: string): number | undefined {
  const value = properties[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function main(): Promise<void> {
  console.log(`Fetching ${SOURCE}`);
  console.log("This file is ~25 MB; the 110m build omits every microstate, so 10m it is.");

  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`Source returned ${String(response.status)}`);

  const geojson = (await response.json()) as { features: Feature[] };
  const known = new Set<string>(COUNTRY_CODES);
  const found = new Map<string, { lat: number; lng: number }>();

  for (const feature of geojson.features) {
    // ISO_A2 is "-99" for France, Norway and several others; ISO_A2_EH is the
    // field that fixes exactly that, so it is tried first.
    const code =
      readString(feature.properties, "ISO_A2_EH") ??
      readString(feature.properties, "ISO_A2") ??
      readString(feature.properties, "WB_A2");

    if (!code || !known.has(code) || found.has(code)) continue;

    // LABEL_Y / LABEL_X are Natural Earth's HAND-PLACED label anchors, not
    // computed centroids. That matters: the centroid of Indonesia is in the Java
    // Sea and the centroid of Norway is in Sweden.
    const lat = readNumber(feature.properties, "LABEL_Y");
    const lng = readNumber(feature.properties, "LABEL_X");
    if (lat === undefined || lng === undefined) continue;

    found.set(code, { lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10 });
  }

  const missing: (keyof typeof COUNTRY_NAMES)[] = [];
  for (const code of COUNTRY_CODES) {
    if (found.has(code)) continue;
    const handFilled = HAND_FILLED[code];
    if (handFilled) {
      found.set(code, handFilled);
      continue;
    }
    missing.push(code);
  }

  if (missing.length > 0) {
    console.error(`\n${String(missing.length)} code(s) have no coordinates:`);
    for (const code of missing) console.error(`  ${code}  ${COUNTRY_NAMES[code]}`);
    console.error("\nAdd them to HAND_FILLED with a cited source, then re-run.");
    process.exitCode = 1;
    return;
  }

  const rows = COUNTRY_CODES.map((code) => {
    const { lat, lng } = found.get(code)!;
    const source = HAND_FILLED[code] ? " // hand-filled" : "";
    return `  ${code}: { lat: ${String(lat)}, lng: ${String(lng)} },${source}`;
  }).join("\n");

  const file = `import type { CountryCode } from "@/lib/countries";
import type { Coordinates } from "@/lib/map-projection";

/**
 * One map pin per ISO 3166-1 country, for the public tracking route map.
 *
 * GENERATED by \`scripts/generate-country-coordinates.ts\` from Natural Earth's
 * \`ne_10m_admin_0_countries\` (PUBLIC DOMAIN) and committed, rather than
 * computed at runtime — the same arrangement as \`lib/countries.ts\`.
 *
 * These are Natural Earth's LABEL_X/LABEL_Y, which are hand-placed label
 * anchors, NOT computed centroids: the centroid of Indonesia falls in the Java
 * Sea and the centroid of Norway falls in Sweden. A handful of territories
 * Natural Earth folds into a parent are marked \`hand-filled\`.
 *
 * Client-safe: plain data, no dependencies.
 */
export const COUNTRY_COORDINATES: Record<CountryCode, Coordinates> = {
${rows}
};
`;

  writeFileSync(OUTPUT, file);
  console.log(`\nWrote ${OUTPUT} — ${String(found.size)} countries.`);
  console.log("Now run: npm run format");
}

await main();
