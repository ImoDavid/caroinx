import mongoose from "mongoose";

/**
 * Opens a connection to this test file's own database on the shared in-memory
 * server. `tests/setup/env.ts` gives each file a distinct database name.
 */
export async function openTestConnection(): Promise<{
  connection: mongoose.Connection;
  db: mongoose.mongo.Db;
  close: () => Promise<void>;
}> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set; tests/setup/env.ts should have set it.");

  const connection = mongoose.createConnection(uri);
  await connection.asPromise();

  return {
    connection,
    db: connection.getClient().db(),
    close: () => connection.close(),
  };
}

export const TEST_SECRET = "test-secret-at-least-32-characters-long-0000";
export const TEST_BASE_URL = "http://localhost:3000";
