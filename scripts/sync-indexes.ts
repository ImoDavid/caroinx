/**
 * Creates the MongoDB indexes this application depends on.
 *
 * This script is NOT optional housekeeping. better-auth does not create the
 * indexes its own schema declares: its adapter only materialises *table-level*
 * `indexes` arrays, and the built-in user/session/account/verification tables
 * declare none. Field-level `unique: true` produces no createIndex call at all.
 *
 * Without this script `user.email` has no unique constraint and every
 * authenticated request scans the `session` collection.
 *
 * Run with: npm run db:indexes
 */
import mongoose from "mongoose";
import type { IndexSpecification } from "mongodb";

type IndexDefinition = {
  collection: string;
  keys: IndexSpecification;
  name: string;
  unique?: boolean;
};

/**
 * Names follow better-auth's own convention, `<table>_<column>_<uidx|idx>`, so
 * that if better-auth ever does start creating these the call becomes a harmless
 * no-op instead of a name conflict.
 */
const INDEXES: readonly IndexDefinition[] = [
  { collection: "user", keys: { email: 1 }, name: "user_email_uidx", unique: true },

  { collection: "session", keys: { token: 1 }, name: "session_token_uidx", unique: true },
  { collection: "session", keys: { userId: 1 }, name: "session_userId_idx" },
  { collection: "session", keys: { expiresAt: 1 }, name: "session_expiresAt_idx" },

  { collection: "account", keys: { userId: 1 }, name: "account_userId_idx" },
  {
    collection: "account",
    keys: { providerId: 1, accountId: 1 },
    name: "account_providerId_accountId_idx",
  },

  { collection: "verification", keys: { identifier: 1 }, name: "verification_identifier_idx" },
  { collection: "verification", keys: { expiresAt: 1 }, name: "verification_expiresAt_idx" },

  // Created by better-auth only when rateLimit.storage === "database", which is
  // how this app configures it in production.
  { collection: "rateLimit", keys: { key: 1 }, name: "rateLimit_key_uidx", unique: true },
];

type Outcome = "created" | "exists" | "conflict";

export async function syncIndexes(db: mongoose.mongo.Db): Promise<{
  results: { name: string; outcome: Outcome; detail?: string }[];
  conflicts: number;
}> {
  const results: { name: string; outcome: Outcome; detail?: string }[] = [];
  let conflicts = 0;

  for (const index of INDEXES) {
    const collection = db.collection(index.collection);
    // listIndexes() is typed loosely; only the name is needed here.
    const existing: { name?: string }[] = await collection
      .listIndexes()
      .toArray()
      .catch(() => []); // collection may not exist yet
    const alreadyPresent = existing.some((candidate) => candidate.name === index.name);

    try {
      await collection.createIndex(index.keys, { name: index.name, unique: index.unique ?? false });
      results.push({ name: index.name, outcome: alreadyPresent ? "exists" : "created" });
    } catch (error) {
      const code = (error as { code?: number }).code;
      conflicts += 1;

      if (code === 85 || code === 86) {
        results.push({
          name: index.name,
          outcome: "conflict",
          detail:
            "an index with this name or key already exists with a different specification — drop it manually, then re-run",
        });
        continue;
      }

      if (code === 11000) {
        // Report how bad it is, so the operator knows what to clean up.
        const field = Object.keys(index.keys as Record<string, unknown>)[0] ?? "_id";
        const duplicates = await collection
          .aggregate([
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $count: "groups" },
          ])
          .toArray()
          .catch(() => []);
        const groups = (duplicates[0] as { groups?: number } | undefined)?.groups ?? "unknown";
        results.push({
          name: index.name,
          outcome: "conflict",
          detail: `duplicate values block this unique index (${String(groups)} duplicated value(s) on "${field}")`,
        });
        continue;
      }

      results.push({
        name: index.name,
        outcome: "conflict",
        detail: (error as Error).message,
      });
    }
  }

  return { results, conflicts };
}

async function main(): Promise<number> {
  const uri = process.env.MONGO_URI;
  if (!uri || !/^mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(uri)) {
    console.error(
      "MONGO_URI is missing or has no database name (expected mongodb+srv://host/dbname). See .env.example.",
    );
    return 1;
  }

  const connection = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 30_000 });

  try {
    await connection.asPromise();
    const db = connection.getClient().db();
    console.log(`Syncing indexes on "${db.databaseName}"\n`);

    const { results, conflicts } = await syncIndexes(db);

    for (const result of results) {
      const label = result.outcome.padEnd(8);
      console.log(`  ${label} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
    }

    // Applies to Mongoose models only; there are none yet. Deliberately NOT
    // connection.syncIndexes(), which DROPS indexes absent from the schema and
    // would be a destructive operation against production data.
    for (const model of Object.values(connection.models)) {
      await model.createIndexes();
    }

    if (conflicts > 0) {
      console.error(`\n${conflicts} index(es) need manual attention.`);
      return 4;
    }

    console.log("\nAll indexes present.");
    return 0;
  } catch (error) {
    console.error("Failed to sync indexes:", (error as Error).message);
    return 3;
  } finally {
    await connection.close();
  }
}

// Only run when executed directly, so tests can import syncIndexes().
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  process.exit(await main());
}
