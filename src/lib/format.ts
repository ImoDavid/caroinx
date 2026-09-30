/**
 * Display formatters shared by Server and Client Components.
 *
 * Every formatter pins BOTH the locale and the time zone. That is deliberate:
 * an unpinned `toLocaleDateString()` uses the runtime's locale and zone, so the
 * server and the browser can disagree and React reports a hydration mismatch.
 * Pinning makes the output identical in both.
 *
 * Client-safe: no `server-only`, no environment access.
 */

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** `2026-03-12T00:00:00.000Z` -> `12 Mar 2026`. */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** `2026-03-12T09:05:00.000Z` -> `12 Mar 2026, 09:05`. */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** The value a `<input type="date">` expects. */
export function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Trims meaningless trailing zeros: 12.50 -> "12.5 kg", 12 -> "12 kg". */
export function formatWeight(kilograms: number): string {
  return `${Number(kilograms.toFixed(2)).toString()} kg`;
}
