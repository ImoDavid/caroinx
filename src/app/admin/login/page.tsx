import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/guards";
import { safeNext } from "@/validations/auth";

import { LoginForm } from "./login-form";

// Per-administrator and session-dependent: never prerendered or cached. Without
// this, `next build` would try to statically render the page and execute the
// session read (and therefore a database connection) at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  // verifySession(), not requireAdmin(): this page must never redirect to itself.
  // The check is database-backed, so a stale-but-present cookie does not bounce
  // an unauthenticated visitor back and forth.
  const session = await verifySession();
  const { next } = await searchParams;
  const destination = safeNext(typeof next === "string" ? next : undefined);

  if (session) redirect(destination);

  return (
    <div className="flex flex-1 items-center justify-center px-margin py-space-2xl">
      <div className="w-full max-w-sm space-y-space-lg">
        <div className="space-y-space-xs text-center">
          <h1 className="font-display text-headline-md text-primary-container">Admin sign in</h1>
          <p className="text-body-sm text-text-muted">
            Authorised personnel only. Accounts are provisioned by an administrator.
          </p>
        </div>
        <LoginForm next={destination === "/admin" ? undefined : destination} />
      </div>
    </div>
  );
}
