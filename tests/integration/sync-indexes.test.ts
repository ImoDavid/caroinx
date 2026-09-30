import type mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { syncIndexes } from "../../scripts/sync-indexes.ts";
import { openTestConnection } from "../helpers/db.ts";

/**
 * better-auth does NOT create the indexes its schema declares — its adapter only
 * materialises table-level `indexes` arrays, and the built-in tables declare
 * none. Without this script `user.email` has no unique constraint and every
 * authenticated request scans the `session` collection. These tests pin that.
 */
let db: mongoose.mongo.Db;
let close: () => Promise<void>;

beforeAll(async () => {
  const opened = await openTestConnection();
  db = opened.db;
  close = opened.close;
});

afterAll(async () => {
  await close();
});

type IndexDoc = { name?: string; unique?: boolean };

/** listIndexes() is typed as any[]; narrow once here rather than at each call site. */
async function listIndexDocs(collection: string): Promise<IndexDoc[]> {
  const raw = await db
    .collection(collection)
    .listIndexes()
    .toArray()
    .catch(() => []);
  return raw as IndexDoc[];
}

async function indexNames(collection: string): Promise<string[]> {
  return (await listIndexDocs(collection)).map((index) => index.name ?? "").sort();
}

describe("syncIndexes", () => {
  it("creates every declared index with no conflicts", async () => {
    const { results, conflicts } = await syncIndexes(db);

    expect(conflicts).toBe(0);
    expect(results.every((result) => result.outcome === "created")).toBe(true);
    // 9 better-auth indexes + 3 for shipments.
    expect(results).toHaveLength(12);
  });

  it("puts a unique index on user.email", async () => {
    expect(await indexNames("user")).toContain("user_email_uidx");

    const emailIndex = (await listIndexDocs("user")).find(
      (index) => index.name === "user_email_uidx",
    );
    expect(emailIndex?.unique).toBe(true);
  });

  it("indexes the session lookup path", async () => {
    const names = await indexNames("session");
    expect(names).toContain("session_token_uidx");
    expect(names).toContain("session_userId_idx");
    expect(names).toContain("session_expiresAt_idx");
  });

  it("indexes account and verification lookups", async () => {
    expect(await indexNames("account")).toContain("account_providerId_accountId_idx");
    expect(await indexNames("verification")).toContain("verification_identifier_idx");
  });

  it("indexes shipments for lookup and for the default list view", async () => {
    const names = await indexNames("shipments");
    expect(names).toContain("shipment_trackingCode_uidx");
    expect(names).toContain("shipment_createdAt_idx");
    expect(names).toContain("shipment_status_createdAt_idx");

    const codeIndex = (await listIndexDocs("shipments")).find(
      (index) => index.name === "shipment_trackingCode_uidx",
    );
    expect(codeIndex?.unique).toBe(true);
  });

  it("actually enforces the unique constraint on shipment.trackingCode", async () => {
    // This is what makes the create-retry in shipment.service.ts safe, and what
    // guarantees a public lookup resolves to exactly one shipment.
    await db.collection("shipments").deleteMany({});
    await db.collection("shipments").insertOne({ trackingCode: "TGR-8F3K2QD7" });

    await expect(
      db.collection("shipments").insertOne({ trackingCode: "TGR-8F3K2QD7" }),
    ).rejects.toMatchObject({ code: 11000 });

    await db.collection("shipments").deleteMany({});
  });

  it("is idempotent: a second run reports every index as existing", async () => {
    const { results, conflicts } = await syncIndexes(db);

    expect(conflicts).toBe(0);
    expect(results.every((result) => result.outcome === "exists")).toBe(true);
  });

  it("actually enforces the unique constraint on user.email", async () => {
    await db.collection("user").deleteMany({});
    await db.collection("user").insertOne({ email: "dup@example.com", name: "One" });

    await expect(
      db.collection("user").insertOne({ email: "dup@example.com", name: "Two" }),
    ).rejects.toMatchObject({ code: 11000 });

    await db.collection("user").deleteMany({});
  });
});
