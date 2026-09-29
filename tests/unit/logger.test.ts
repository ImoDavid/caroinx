import { describe, expect, it } from "vitest";

import { __scrubForTest as scrub } from "@/lib/logger";

/**
 * The redaction contract. `no-console` is an error across src/** specifically so
 * that every log goes through this function — if it stops redacting, secrets
 * reach the logs.
 */
describe("logger redaction", () => {
  const redactedKeys = [
    "password",
    "newPassword",
    "confirmPassword",
    "token",
    "sessionToken",
    "secret",
    "BETTER_AUTH_SECRET",
    "cookie",
    "authorization",
    "passwordHash",
    "hash",
    "salt",
    "MONGO_URI",
    "credential",
    "apiKey",
    "api_key",
    "privateKey",
  ];

  for (const key of redactedKeys) {
    it(`redacts "${key}"`, () => {
      expect(scrub({ [key]: "super-sensitive" })).toEqual({ [key]: "[redacted]" });
    });
  }

  it("leaves harmless keys intact", () => {
    expect(scrub({ email: "admin@example.com", userId: "abc123", count: 3 })).toEqual({
      email: "admin@example.com",
      userId: "abc123",
      count: 3,
    });
  });

  it("walks nested objects", () => {
    expect(scrub({ outer: { inner: { password: "x", email: "a@b.c" } } })).toEqual({
      outer: { inner: { password: "[redacted]", email: "a@b.c" } },
    });
  });

  it("walks arrays", () => {
    expect(scrub([{ token: "t" }, { name: "ok" }])).toEqual([
      { token: "[redacted]" },
      { name: "ok" },
    ]);
  });

  it("masks credentials inside a bare connection string", () => {
    const result = scrub("mongodb+srv://dbuser:s3cr3t@cluster0.example.mongodb.net/sendly");
    expect(result).toBe("mongodb+srv://[redacted]@cluster0.example.mongodb.net/sendly");
    expect(result).not.toContain("s3cr3t");
    expect(result).not.toContain("dbuser");
  });

  it("masks credentials in a plain mongodb:// string too", () => {
    expect(scrub("mongodb://u:p@localhost:27017/db")).toBe(
      "mongodb://[redacted]@localhost:27017/db",
    );
  });

  it("reduces an Error to name, message and stack", () => {
    const result = scrub(new TypeError("boom")) as Record<string, unknown>;
    expect(result.name).toBe("TypeError");
    expect(result.message).toBe("boom");
    expect(typeof result.stack).toBe("string");
  });

  it("stops recursing on deeply nested input", () => {
    let deep: Record<string, unknown> = { password: "x" };
    for (let i = 0; i < 12; i += 1) deep = { nested: deep };
    // Must terminate and must not throw.
    expect(() => JSON.stringify(scrub(deep))).not.toThrow();
  });

  it("does not leak a secret nested below the depth limit", () => {
    let deep: Record<string, unknown> = { password: "must-not-appear" };
    for (let i = 0; i < 12; i += 1) deep = { nested: deep };
    expect(JSON.stringify(scrub(deep))).not.toContain("must-not-appear");
  });
});
