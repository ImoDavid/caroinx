import { describe, expect, it } from "vitest";

import { loginSchema, safeNext } from "@/validations/auth";

describe("loginSchema", () => {
  it("accepts a valid credential pair", () => {
    const result = loginSchema.safeParse({ email: "admin@example.com", password: "a-password" });
    expect(result.success).toBe(true);
  });

  it("trims and lowercases the email", () => {
    const result = loginSchema.safeParse({ email: "  Admin@Example.COM  ", password: "pw" });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("admin@example.com");
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "pw" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["email"]);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "admin@example.com", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("rejects an absurdly long password before it reaches the hasher", () => {
    const result = loginSchema.safeParse({
      email: "admin@example.com",
      password: "x".repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it("treats next as optional", () => {
    const result = loginSchema.safeParse({ email: "admin@example.com", password: "pw" });
    expect(result.data?.next).toBeUndefined();
  });
});

describe("safeNext", () => {
  // Anything that is not an in-app admin path must collapse to the dashboard.
  const collapses = [
    ["undefined", undefined],
    ["null", null],
    ["empty string", ""],
    ["protocol-relative", "//evil.example.com"],
    ["absolute http", "http://evil.example.com"],
    ["absolute https", "https://evil.example.com/admin"],
    ["site root", "/"],
    ["a non-admin path", "/settings"],
    ["a lookalike prefix", "/administrator"],
    ["traversal", "/admin/../etc/passwd"],
    ["backslash trick", "\\\\evil.example.com"],
  ] as const;

  for (const [label, input] of collapses) {
    it(`collapses ${label} to /admin`, () => {
      expect(safeNext(input)).toBe("/admin");
    });
  }

  it("preserves a genuine admin sub-path", () => {
    expect(safeNext("/admin/codes")).toBe("/admin/codes");
  });

  it("preserves /admin itself", () => {
    expect(safeNext("/admin")).toBe("/admin");
  });
});
