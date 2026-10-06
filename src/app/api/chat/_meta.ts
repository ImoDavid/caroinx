import "server-only";

import type { NextRequest } from "next/server";

import { isCountryCode } from "@/lib/countries";
import type { VisitorMeta } from "@/types/chat";

/**
 * Snapshots where a conversation started, from the request headers.
 *
 * Lives here rather than in the service because `request.headers` IS request
 * context, and `src/services/**` may not import `next/*` (lint-enforced) — the
 * handler resolves it and passes plain data in.
 *
 * Not a route: the `_` prefix marks it as a colocated module, and routing only
 * ever picks up the special file names.
 *
 * Deliberately NOT collected: the IP, from `x-forwarded-for` or anywhere else.
 * It is the one value that identifies a person beyond what they typed into the
 * form, no support answer needs it, and this application documents its
 * disclosures (gap 15) rather than accumulating them quietly.
 */

/** Free-text headers are attacker-controlled and unbounded, so they are capped. */
const USER_AGENT_MAX = 256;
const REFERER_MAX = 512;

/**
 * Vercel percent-encodes this header. Without decoding, "São Paulo" is stored
 * forever as "S%C3%A3o%20Paulo" — and `decodeURIComponent` throws on a malformed
 * sequence, which a header must never be able to turn into a 500.
 */
function decodeCity(raw: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function trimmed(raw: string | null, max: number): string | undefined {
  const value = raw?.trim();
  return value ? value.slice(0, max) : undefined;
}

/**
 * Every field is optional and the whole object is undefined when nothing was
 * found, because NONE of the `x-vercel-*` headers exist under `next dev` — the
 * admin card renders "Not recorded" rather than guessing a country from a locale.
 */
export function visitorMetaFrom(request: NextRequest): VisitorMeta | undefined {
  const headers = request.headers;
  const country = headers.get("x-vercel-ip-country")?.trim().toUpperCase();

  const meta: VisitorMeta = {
    // Checked, not cast — the header is a claim from outside.
    country: isCountryCode(country) ? country : undefined,
    region: trimmed(headers.get("x-vercel-ip-country-region"), 64),
    city: decodeCity(headers.get("x-vercel-ip-city")),
    timezone: trimmed(headers.get("x-vercel-ip-timezone"), 64),
    userAgent: trimmed(headers.get("user-agent"), USER_AGENT_MAX),
    referer: trimmed(headers.get("referer"), REFERER_MAX),
  };

  return Object.values(meta).some((value) => value !== undefined) ? meta : undefined;
}
