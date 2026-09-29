import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

/**
 * The proxy is an optimistic UX redirect, not a security boundary. These tests
 * pin the one behaviour that actually matters: it must never redirect *away from*
 * the login page, because a stale-but-present cookie would then ping-pong
 * forever between /admin/login and /admin.
 */
const SESSION_COOKIE = "better-auth.session_token";

function request(pathname: string, cookie?: string) {
  const url = `http://localhost:3000${pathname}`;
  const headers = new Headers();
  if (cookie) headers.set("cookie", `${SESSION_COOKIE}=${cookie}`);
  return new NextRequest(new Request(url, { headers }));
}

describe("proxy", () => {
  it("redirects an uncookied visitor to the login page, preserving the destination", () => {
    const response = proxy(request("/admin"));
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).toContain("/admin/login");
    expect(location).toContain("next=%2Fadmin");
  });

  it("preserves a nested destination", () => {
    const location = proxy(request("/admin/codes")).headers.get("location");
    expect(location).toContain("next=%2Fadmin%2Fcodes");
  });

  it("lets a cookied request through", () => {
    const response = proxy(request("/admin", "any-value"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects away from the login page, even with a cookie present", () => {
    // The regression guard. A stale cookie here must NOT bounce to /admin.
    const response = proxy(request("/admin/login", "stale-but-present"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets the login page through with no cookie", () => {
    const response = proxy(request("/admin/login"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("drops any pre-existing query string rather than forwarding it", () => {
    const location = proxy(request("/admin?debug=1")).headers.get("location");
    expect(location).not.toContain("debug=1");
  });
});
