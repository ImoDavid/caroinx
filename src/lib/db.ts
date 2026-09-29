import "server-only";

import mongoose, { type Connection } from "mongoose";
import type { Db } from "mongodb";

import { env, isProduction } from "@/lib/env";
import { logger } from "@/lib/logger";

type ConnectionCache = {
  connection: Connection;
  db: Db;
  /** The in-flight handshake, so concurrent callers share one attempt. */
  ready?: Promise<Connection>;
};

// Cached on globalThis rather than in module scope: `next dev` replaces module
// instances on hot reload and a warm serverless invocation reuses the process.
// Either would otherwise open a fresh connection pool per reload or per request.
const globalCache = globalThis as typeof globalThis & {
  __sendlyMongo?: ConnectionCache;
};

function handle(): ConnectionCache {
  if (!globalCache.__sendlyMongo) {
    const connection = mongoose.createConnection(env.MONGO_URI, {
      maxPoolSize: 10,
      // Measured ~6s on a cold connect to this Atlas cluster, and an
      // unreachable replica-set member eats much of the budget during server
      // selection, so 10s was marginal.
      serverSelectionTimeoutMS: 20_000,
      // Index changes go through `npm run db:indexes`, never implicitly on model
      // compilation, so production schema changes stay deliberate.
      autoIndex: !isProduction,
    });

    connection.on("error", (error: unknown) => {
      logger.error("mongodb connection error", { error });
    });

    // getClient() returns a MongoClient synchronously while readyState is still
    // 2 (connecting), and client.db() resolves the database from the URI. Both
    // are pure — no I/O. This is what lets lib/auth/auth.ts construct the
    // better-auth adapter at module scope with no top-level await, and therefore
    // lets `next build` complete without reaching MongoDB.
    // (connection.db is still undefined at this point, which is why it is unused.)
    globalCache.__sendlyMongo = {
      connection,
      db: connection.getClient().db(),
    };
  }

  return globalCache.__sendlyMongo;
}

const cache = handle();

export const connection = cache.connection;

/**
 * The raw driver handle, available synchronously. Safe to hand to
 * `mongodbAdapter()` before the handshake completes: the adapter only calls
 * `db.collection(...)` inside its operations.
 */
export const db = cache.db;

/**
 * Await before querying. The promise — not just the connection — is cached, so
 * concurrent callers share one handshake. A rejection clears the cache so the
 * next caller retries rather than inheriting a poisoned promise.
 *
 * The driver would auto-connect anyway; awaiting this turns a deep server
 * selection timeout into an early, legible failure.
 */
export function connectToDatabase(): Promise<Connection> {
  const current = handle();
  current.ready ??= current.connection.asPromise().catch((error: unknown) => {
    current.ready = undefined;
    throw error;
  });
  return current.ready;
}
