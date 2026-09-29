import { betterAuth } from "better-auth/minimal";
import type mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthOptions } from "@/lib/auth/options";

import { seedAdmin } from "../../scripts/seed-admin.ts";
import { openTestConnection, TEST_BASE_URL, TEST_SECRET } from "../helpers/db.ts";

/**
 * The DAL is the real authorization boundary, so these tests cover what it
 * returns as much as whether it lets you in — in particular that the session
 * token and password hash never cross it.
 */
const EMAIL = "admin@example.com";
const PASSWORD = "correct-horse-battery";

// Captured per test so each can present different request headers.
let currentHeaders = new Headers();

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(currentHeaders),
}));

class RedirectError extends Error {
  constructor(public readonly to: string) {
    super(`REDIRECT:${to}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

let db: mongoose.mongo.Db;
let close: () => Promise<void>;
let sessionCookie: string;

beforeAll(async () => {
  const opened = await openTestConnection();
  db = opened.db;
  close = opened.close;

  await seedAdmin({
    db,
    secret: TEST_SECRET,
    baseURL: TEST_BASE_URL,
    email: EMAIL,
    password: PASSWORD,
    name: "Administrator",
    rotatePassword: false,
  });

  // Sign in through better-auth to obtain a genuine session cookie.
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

  const response = await auth.api.signInEmail({
    body: { email: EMAIL, password: PASSWORD },
    headers: new Headers(),
    asResponse: true,
  });

  const setCookie = response.headers.get("set-cookie") ?? "";
  sessionCookie = setCookie.split(";")[0] ?? "";
  expect(sessionCookie).toContain("session_token");
});

beforeEach(() => {
  currentHeaders = new Headers();
  // React's cache() memoises per module instance; reset so each test starts cold.
  vi.resetModules();
});

afterAll(async () => {
  await close();
});

/** Imported fresh each time so React's cache() does not leak between tests. */
async function loadGuards() {
  return import("@/lib/auth/guards");
}

describe("verifySession", () => {
  it("returns null when no cookie is present", async () => {
    const { verifySession } = await loadGuards();
    expect(await verifySession()).toBeNull();
  });

  it("returns null for a garbage cookie", async () => {
    currentHeaders = new Headers({ cookie: "better-auth.session_token=not-a-real-token" });
    const { verifySession } = await loadGuards();
    expect(await verifySession()).toBeNull();
  });

  it("returns a narrow DTO for a valid session", async () => {
    currentHeaders = new Headers({ cookie: sessionCookie });
    const { verifySession } = await loadGuards();
    const session = await verifySession();

    expect(session).not.toBeNull();
    expect(session?.email).toBe(EMAIL);
    expect(session?.role).toBe("admin");
    // The DTO contract: exactly these four fields, and nothing else.
    expect(Object.keys(session ?? {}).sort()).toEqual(["email", "name", "role", "userId"]);
  });

  it("leaks neither the session token nor the password hash", async () => {
    currentHeaders = new Headers({ cookie: sessionCookie });
    const { verifySession } = await loadGuards();
    const serialised = JSON.stringify(await verifySession());

    expect(serialised).not.toContain("token");
    expect(serialised).not.toContain("password");
    expect(serialised).not.toContain(PASSWORD);
  });

  it("rejects a valid session whose user is no longer an admin", async () => {
    await db.collection("user").updateOne({ email: EMAIL }, { $set: { role: "editor" } });
    currentHeaders = new Headers({ cookie: sessionCookie });

    try {
      const { verifySession } = await loadGuards();
      expect(await verifySession()).toBeNull();
    } finally {
      await db.collection("user").updateOne({ email: EMAIL }, { $set: { role: "admin" } });
    }
  });

  it("returns null once the session row is deleted, even with the cookie intact", async () => {
    const sessions = await db.collection("session").find({}).toArray();
    await db.collection("session").deleteMany({});
    currentHeaders = new Headers({ cookie: sessionCookie });

    try {
      const { verifySession } = await loadGuards();
      expect(await verifySession()).toBeNull();
    } finally {
      if (sessions.length > 0) await db.collection("session").insertMany(sessions);
    }
  });
});

describe("requireAdmin", () => {
  it("redirects to the login page when there is no session", async () => {
    const { requireAdmin } = await loadGuards();
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("returns the session when one is present", async () => {
    currentHeaders = new Headers({ cookie: sessionCookie });
    const { requireAdmin } = await loadGuards();
    expect((await requireAdmin()).email).toBe(EMAIL);
  });
});
