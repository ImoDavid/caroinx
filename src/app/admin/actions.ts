"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { requireAdmin } from "@/lib/auth/guards";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * A Server Action is a POST endpoint reachable by anyone who can send the
 * request — rendering the form on an authenticated page is not a security
 * boundary. So this re-verifies rather than trusting the caller, as every future
 * admin mutation must.
 */
export async function signOutAction(): Promise<void> {
  await connectToDatabase();
  const session = await requireAdmin();

  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    // A failed revocation must not trap the user on the dashboard; the redirect
    // below still moves them off it.
    logger.error("sign-out failed", { error, userId: session.userId });
  }

  redirect("/admin/login");
}
