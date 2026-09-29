import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db";

/**
 * The Data Access Layer for authentication.
 *
 * Next's own guidance is that authorization belongs here and in every Server
 * Action — NOT in a layout. Layouts do not re-render on client-side navigation
 * (so the session would not be re-checked on a route change) and a layout does
 * not control whether sibling segments render, because the router renders route
 * segments and parallel slots independently. A layout that hides its children
 * therefore does not stop them executing or appearing in the RSC payload, and it
 * does nothing at all for Server Actions, which are separate entry points.
 */

/**
 * Deliberately narrow. Nothing from the raw user or session document leaks past
 * this boundary — in particular not the session `token`, and not the credential
 * account's password hash.
 */
export type AdminSession = {
  userId: string;
  email: string;
  name: string;
  role: "admin";
};

/**
 * Reads and validates the session against the database.
 *
 * `cache()` memoises for a single render pass, so a page plus several components
 * share one lookup. It never redirects, which is what lets the login page ask
 * "is anyone already signed in?" without bouncing itself.
 */
export const verifySession = cache(async (): Promise<AdminSession | null> => {
  // Read the request headers FIRST. This is what marks the route dynamic, and
  // doing it before any I/O means a prerender attempt bails out before we try to
  // open a database connection.
  const requestHeaders = await headers();

  await connectToDatabase();

  const result = await auth.api.getSession({ headers: requestHeaders });
  if (!result) return null;

  // `role` is typed as the literal "admin", but it is checked anyway: the value
  // comes from the database and could have been changed out from under us.
  if (result.user.role !== "admin") return null;

  return {
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role,
  };
});

/**
 * The security boundary for admin pages and actions. `redirect()` throws
 * NEXT_REDIRECT and is typed `never`, so callers receive a narrowed value.
 *
 * Never call this from the login page — it would redirect to itself.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await verifySession();
  // Outside any try/catch: NEXT_REDIRECT must be allowed to propagate.
  if (!session) redirect("/admin/login");
  return session;
}
