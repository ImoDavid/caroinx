import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";

import { signOutAction } from "./actions";

// Per-administrator and session-dependent: never prerendered or cached. Without
// this, `next build` would try to statically render the page and execute the
// session read (and therefore a database connection) at build time.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // The security boundary for this page. Redirects to /admin/login if absent.
  const session = await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-space-lg px-margin py-space-2xl">
      <header className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="space-y-space-xs">
          <h1 className="font-display text-headline-md text-primary-container">Dashboard</h1>
          <p className="text-body-sm text-text-muted">
            Signed in as <span className="font-medium text-on-surface">{session.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <span className="rounded-badge bg-secondary-container px-2.5 py-1 text-label-badge font-bold text-on-primary-fixed uppercase">
            {session.role}
          </span>
          {/* A plain form: no client JavaScript, and the action re-verifies. */}
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="lg" className="min-h-11">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="rounded-xl border border-border-subtle bg-surface-white p-space-lg">
        <h2 className="font-display text-title-sm font-bold text-primary-container">
          Code management
        </h2>
        <p className="pt-space-xs text-body-sm text-text-muted">
          Not built yet. The authentication foundation is in place; code creation, lookup and
          management come next.
        </p>
      </div>
    </div>
  );
}
