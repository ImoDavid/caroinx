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

const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/**
 * `2026-03-12T09:05:00.000Z` -> `09:05`. For a chat bubble, where the date is
 * carried by a day separator rather than repeated on every line.
 *
 * UTC like every other formatter here, which is a real trade: a visitor in Lagos
 * sees 09:05 for a message their own clock calls 10:05. Showing local time would
 * read better but would break this module's one guarantee — identical output on
 * the server and in the browser — and the admin thread IS server-rendered. The
 * public tracking page already shows UTC for the same reason, so this is the
 * consistent answer rather than a special case.
 */
export function formatTime(iso: string): string {
  return TIME.format(new Date(iso));
}

/** The value a `<input type="date">` expects. */
export function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Trims meaningless trailing zeros: 12.50 -> "12.5 kg", 12 -> "12 kg". */
export function formatWeight(kilograms: number): string {
  return `${Number(kilograms.toFixed(2)).toString()} kg`;
}

/**
 * The customs charge. Unlike weight this keeps both decimal places — money reads
 * wrong without them — and the currency is fixed because the schema stores one.
 */
const AMOUNT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** `1250.5` -> `$1,250.50`. */
export function formatAmount(amount: number): string {
  return AMOUNT.format(amount);
}

/** The value a `<input type="number">` expects, with no thousands separators. */
export function toAmountInputValue(amount: number): string {
  return amount.toFixed(2);
}
