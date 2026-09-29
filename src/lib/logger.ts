import "server-only";

import { env, isProduction } from "@/lib/env";

/**
 * The only sanctioned output channel in `src/**` — `eslint.config.mjs` sets
 * `no-console: "error"` there precisely so that redaction cannot be forgotten.
 *
 * Redaction is applied to every call and is keyed on the *name* of each field, so
 * a caller who logs a whole object still cannot leak a password or a token.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;

type Level = keyof typeof LEVELS;

const SENSITIVE_KEY =
  /pass(word)?|secret|token|cookie|authorization|hash|salt|uri|dsn|credential|api[-_]?key|private/i;

/** mongodb://user:pass@host or mongodb+srv://user:pass@host */
const CONNECTION_CREDENTIALS = /(mongodb(?:\+srv)?:\/\/)[^:/@\s]+:[^@/\s]+@/gi;

const REDACTED = "[redacted]";
const MAX_DEPTH = 4;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[depth]";

  if (value instanceof Error) {
    // The stack is useful in logs and must never reach a user-facing response.
    return { name: value.name, message: scrub(value.message, depth + 1), stack: value.stack };
  }

  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1));

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : scrub(item, depth + 1),
      ]),
    );
  }

  // Catches a connection string passed as a bare positional value.
  if (typeof value === "string") return value.replace(CONNECTION_CREDENTIALS, `$1${REDACTED}@`);

  return value;
}

const threshold = LEVELS[env.LOG_LEVEL ?? (isProduction ? "info" : "debug")];

function emit(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;

  const safeMessage = String(scrub(message));
  const safeContext = context ? (scrub(context) as Record<string, unknown>) : undefined;

  // One JSON line per call in production so the platform's log drain parses it;
  // a readable line in development.
  const line = isProduction
    ? JSON.stringify({
        level,
        time: new Date().toISOString(),
        message: safeMessage,
        ...safeContext,
      })
    : `${level.toUpperCase()} ${safeMessage}${safeContext ? ` ${JSON.stringify(safeContext)}` : ""}`;

  // The one place in src/** allowed to write to stdout/stderr.
  // eslint-disable-next-line no-console
  (level === "error" || level === "warn" ? console.error : console.log)(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};

/** Exported for the redaction tests; not part of the logging surface. */
export const __scrubForTest = scrub;
