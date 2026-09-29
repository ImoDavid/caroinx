import { betterAuth } from "better-auth/minimal";
import type mongoose from "mongoose";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createAuthOptions } from "@/lib/auth/options";

import { seedAdmin } from "../../scripts/seed-admin.ts";
import { openTestConnection, TEST_BASE_URL, TEST_SECRET } from "../helpers/db.ts";

/**
 * The seed script is the only way an administrator comes into existence, so these
 * are the highest-value tests in the suite. The final case is the one that proves
 * the whole design: an account this script creates can actually sign in.
 */
const EMAIL = "Admin@Example.COM";
const PASSWORD = "correct-horse-battery";

let db: mongoose.mongo.Db;
let close: () => Promise<void>;

function deps(overrides: Partial<Parameters<typeof seedAdmin>[0]> = {}) {
  return {
    db,
    secret: TEST_SECRET,
    baseURL: TEST_BASE_URL,
    email: EMAIL,
    password: PASSWORD,
    name: "Administrator",
    rotatePassword: false,
    ...overrides,
  };
}

beforeEach(async () => {
  if (!db) {
    const opened = await openTestConnection();
    db = opened.db;
    close = opened.close;
  }
  await db.collection("user").deleteMany({});
  await db.collection("account").deleteMany({});
  await db.collection("session").deleteMany({});
});

afterAll(async () => {
  await close?.();
});

/** The stored scrypt hash, typed so lint can see it is a string. */
async function storedPasswordHash(): Promise<string | undefined> {
  const account = await db.collection<{ password?: string }>("account").findOne({});
  return account?.password;
}

describe("seedAdmin", () => {
  it("creates one user and one credential account", async () => {
    expect(await seedAdmin(deps())).toBe("created");

    const user = await db.collection("user").findOne({});
    const account = await db.collection("account").findOne({});

    expect(user?.email).toBe("admin@example.com"); // normalised
    expect(user?.role).toBe("admin");
    // The hash lives on `account`, never on `user`.
    expect(user).not.toHaveProperty("password");

    expect(account?.providerId).toBe("credential");
    expect(account?.accountId).toBe(String(user?._id));
    // better-auth's scrypt format: "<saltHex>:<keyHex>".
    expect(account?.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it("is idempotent: a second run writes nothing", async () => {
    await seedAdmin(deps());
    const before = await db.collection("account").findOne({});

    expect(await seedAdmin(deps())).toBe("already exists — no changes");

    const after = await db.collection("account").findOne({});
    expect(await db.collection("user").countDocuments()).toBe(1);
    expect(String(after?._id)).toBe(String(before?._id));
    expect(after?.password).toBe(before?.password);
    expect(String(after?.updatedAt)).toBe(String(before?.updatedAt));
  });

  it("repairs a user whose credential account is missing", async () => {
    await seedAdmin(deps());
    await db.collection("account").deleteMany({});

    expect(await seedAdmin(deps())).toBe("repaired");
    expect(await db.collection("account").countDocuments()).toBe(1);
    expect(await db.collection("user").countDocuments()).toBe(1);
  });

  it("rotates the password only when asked, invalidating the old one", async () => {
    await seedAdmin(deps());
    const original = await storedPasswordHash();

    expect(await seedAdmin(deps({ password: "a-brand-new-password", rotatePassword: true }))).toBe(
      "password rotated",
    );

    const rotated = await storedPasswordHash();
    expect(rotated).not.toBe(original);
  });

  it("refuses to escalate an existing non-admin user", async () => {
    await seedAdmin(deps());
    await db.collection("user").updateOne({}, { $set: { role: "editor" } });

    await expect(seedAdmin(deps())).rejects.toThrow(/role "editor"/);
    // Nothing was changed.
    expect((await db.collection("user").findOne({}))?.role).toBe("editor");
  });

  it("produces an account that can actually sign in", async () => {
    await seedAdmin(deps());

    const auth = betterAuth(
      createAuthOptions({
        db,
        baseURL: TEST_BASE_URL,
        secret: TEST_SECRET,
        logLevel: "error",
        log: () => {},
        rateLimitEnabled: false,
      }),
    );

    const result = await auth.api.signInEmail({
      body: { email: "admin@example.com", password: PASSWORD },
      headers: new Headers(),
    });

    expect(result.user.email).toBe("admin@example.com");
    expect(result.user.role).toBe("admin");
  });

  it("rejects the wrong password without revealing why", async () => {
    await seedAdmin(deps());

    const auth = betterAuth(
      createAuthOptions({
        db,
        baseURL: TEST_BASE_URL,
        secret: TEST_SECRET,
        logLevel: "error",
        log: () => {},
        rateLimitEnabled: false,
      }),
    );

    await expect(
      auth.api.signInEmail({
        body: { email: "admin@example.com", password: "not-the-password" },
        headers: new Headers(),
      }),
    ).rejects.toThrow(/invalid email or password/i);
  });
});
