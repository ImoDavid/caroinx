import type mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedAdmin } from "../../scripts/seed-admin.ts";
import { openTestConnection, TEST_BASE_URL, TEST_SECRET } from "../helpers/db.ts";

/**
 * Exercises the mounted better-auth HTTP surface by calling the Route Handler's
 * own exports with a plain Request — no dev server required.
 */
const EMAIL = "admin@example.com";
const PASSWORD = "correct-horse-battery";

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

afterAll(async () => {
  await close();
});

function url(path: string) {
  return `${TEST_BASE_URL}/api/auth${path}`;
}

async function post(path: string, body: unknown, headers: HeadersInit = {}) {
  const { POST } = await import("@/app/api/auth/[...all]/route");
  return POST(
    new Request(url(path), {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe("auth route handler", () => {
  it("exports all five methods toNextJsHandler provides", async () => {
    const route = await import("@/app/api/auth/[...all]/route");
    for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"] as const) {
      expect(typeof route[method]).toBe("function");
    }
  });

  it("returns 404 for sign-up — the endpoint is removed, not merely disabled", async () => {
    const response = await post("/sign-up/email", {
      email: "intruder@example.com",
      password: "aaaaaaaaaaaaaa",
      name: "Intruder",
    });

    expect(response.status).toBe(404);
    // And nothing was created.
    expect(await db.collection("user").countDocuments({ email: "intruder@example.com" })).toBe(0);
  });

  it("returns 404 for the password-reset endpoints", async () => {
    expect((await post("/forget-password", { email: EMAIL })).status).toBe(404);
    expect((await post("/reset-password", { newPassword: "x".repeat(12) })).status).toBe(404);
  });

  it("reports no session when no cookie is sent", async () => {
    const { GET } = await import("@/app/api/auth/[...all]/route");
    const response = await GET(new Request(url("/get-session")));

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("issues a hardened session cookie on successful sign-in", async () => {
    const response = await post("/sign-in/email", { email: EMAIL, password: PASSWORD });
    expect(response.status).toBe(200);

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session_token");
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//i);
    // baseURL is http:// in tests, so Secure is correctly absent here.
    expect(setCookie).not.toMatch(/Secure/i);
  });

  it("rejects a wrong password with 401 and sets no cookie", async () => {
    const response = await post("/sign-in/email", { email: EMAIL, password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not disclose whether an email exists", async () => {
    const unknown = await post("/sign-in/email", {
      email: "nobody@example.com",
      password: PASSWORD,
    });
    const wrongPassword = await post("/sign-in/email", { email: EMAIL, password: "wrong" });

    expect(unknown.status).toBe(wrongPassword.status);
    expect(await unknown.json()).toEqual(await wrongPassword.json());
  });
});
