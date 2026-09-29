import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect for the admin area. This is a UX shortcut, NOT a security
 * boundary: `getSessionCookie` only checks that a cookie is present — it does not
 * validate the signature and never touches the database. The real checks live in
 * `requireAdmin()` on each page and in every Server Action.
 *
 * Named `proxy.ts` because `middleware` is deprecated and renamed in Next 16. The
 * runtime is Node.js and is not configurable here; setting `runtime` throws.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never redirect away FROM the login page.
  //
  // The symmetric rule — "cookie present on /admin/login, so send them to
  // /admin" — is an infinite loop: a stale but present cookie would bounce to
  // /admin, the database check there would fail, and it would bounce straight
  // back. The already-signed-in case is handled by the login page itself using
  // the database-backed verifySession().
  if (pathname === "/admin/login") return NextResponse.next();

  if (getSessionCookie(request)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

/**
 * Scoped to the admin area. Without a matcher this would run on every request —
 * including `_next/static`, `_next/image` and `public/` — which the docs warn can
 * block CSS, JS and images. A narrow matcher is safe here precisely because the
 * proxy is not the boundary.
 */
export const config = {
  matcher: ["/admin/:path*"],
};
