import "server-only";

import { betterAuth } from "better-auth/minimal";

import { createAuthOptions } from "@/lib/auth/options";
import { db } from "@/lib/db";
import { env, isProduction } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * The server-side auth instance.
 *
 * `better-auth/minimal` is the same `betterAuth` without the Kysely dependency,
 * which this project never needs because it uses the MongoDB adapter.
 *
 * Note this is plain module scope with no top-level await: `db` is available
 * synchronously (see lib/db.ts), so `next build` does not connect to MongoDB.
 */
export const auth = betterAuth(
  createAuthOptions({
    db,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    logLevel: isProduction ? "warn" : "info",
    // Routed through our logger so better-auth's own output is redacted too —
    // sign-in logs "User not found" / "Invalid password" at warn level and would
    // otherwise bypass redaction entirely.
    log: (level, message, ...args) => {
      logger[level](`[better-auth] ${message}`, args.length > 0 ? { args } : undefined);
    },
    rateLimitEnabled: isProduction,
  }),
);
