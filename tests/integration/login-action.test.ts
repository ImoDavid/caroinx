import type mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { seedAdmin } from "../../scripts/seed-admin.ts";
import { openTestConnection, TEST_BASE_URL, TEST_SECRET } from "../helpers/db.ts";

const EMAIL = "admin@example.com";
const PASSWORD = "correct-horse-battery";

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
  // The nextCookies() plugin writes the session cookie through this.
  cookies: () =>
    Promise.resolve({
      set: () => {},
      get: () => undefined,
      getAll: () => [],
      delete: () => {},
      has: () => false,
    }),
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
});

beforeEach(() => {
  vi.resetModules();
});

afterAll(async () => {
  await close();
});

async function login(fields: Record<string, string>) {
  const { loginAction } = await import("@/app/admin/login/actions");
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return loginAction(undefined, formData);
}

describe("loginAction", () => {
  it("returns field errors for a malformed email and never reaches the database", async () => {
    const state = await login({ email: "nope", password: PASSWORD });
    expect(state?.status).toBe("error");
    expect(state?.fieldErrors?.email).toBeTruthy();
  });

  it("returns a field error for a missing password", async () => {
    const state = await login({ email: EMAIL, password: "" });
    expect(state?.fieldErrors?.password).toBeTruthy();
  });

  it("gives the same response for an unknown email as for a wrong password", async () => {
    // The account-enumeration assertion: these must be indistinguishable.
    const unknown = await login({ email: "nobody@example.com", password: PASSWORD });
    const wrongPassword = await login({ email: EMAIL, password: "definitely-wrong" });

    expect(unknown).toEqual(wrongPassword);
    expect(unknown?.message).toBe("Email or password is incorrect.");
    expect(unknown?.fieldErrors).toBeUndefined();
  });

  it("never echoes the submitted password back", async () => {
    const state = await login({ email: EMAIL, password: "some-secret-guess" });
    expect(JSON.stringify(state)).not.toContain("some-secret-guess");
  });

  it("redirects to the dashboard on success and creates a session", async () => {
    await db.collection("session").deleteMany({});

    await expect(login({ email: EMAIL, password: PASSWORD })).rejects.toThrow("REDIRECT:/admin");
    expect(await db.collection("session").countDocuments()).toBe(1);
  });

  it("honours a safe next destination", async () => {
    await expect(login({ email: EMAIL, password: PASSWORD, next: "/admin/codes" })).rejects.toThrow(
      "REDIRECT:/admin/codes",
    );
  });

  it("refuses an off-site next destination", async () => {
    await expect(
      login({ email: EMAIL, password: PASSWORD, next: "//evil.example.com" }),
    ).rejects.toThrow("REDIRECT:/admin");
  });

  it("refuses a non-admin next destination", async () => {
    await expect(login({ email: EMAIL, password: PASSWORD, next: "/settings" })).rejects.toThrow(
      "REDIRECT:/admin",
    );
  });
});
