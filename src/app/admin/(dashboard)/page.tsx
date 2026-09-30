import { ArrowRight, Mail, Package, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";

// Per-administrator and session-dependent: never prerendered or cached. Without
// this, `next build` would try to statically render the page and execute the
// session read (and therefore a database connection) at build time.
export const dynamic = "force-dynamic";

type WorkspaceStatus = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly live: boolean;
  readonly note: string;
};

// Mirrors the "What exists today" table in CLAUDE.md, so every claim here is
// verifiable from the repository. Deliberately status, not metrics: there is no
// Code model yet, so any number on this page would be invented.
const WORKSPACE_STATUS = [
  {
    icon: ShieldCheck,
    label: "Admin authentication",
    live: true,
    note: "Password sign-in with database-backed sessions.",
  },
  {
    icon: Package,
    label: "Cargo codes",
    live: false,
    note: "Creating, editing and retiring tracking codes.",
  },
  {
    icon: Search,
    label: "Public code lookup",
    live: false,
    note: "The customer-facing page that resolves a code.",
  },
  {
    icon: Mail,
    label: "Email notifications",
    live: false,
    note: "No transport configured — password rotation runs from the CLI.",
  },
] as const satisfies readonly WorkspaceStatus[];

function StatusCard({ status }: { status: WorkspaceStatus }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground"
        >
          <status.icon className="size-5" />
        </span>
        <CardTitle className="pt-space-sm text-title-sm">{status.label}</CardTitle>
        <CardDescription>{status.note}</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant={status.live ? "default" : "secondary"}>
          {status.live ? "Live" : "Not built"}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  // The security boundary for this page. Redirects to /admin/login if absent.
  const session = await requireAdmin();

  return (
    // The <h1> belongs to the topbar, so this page starts at <h2>.
    <div className="space-y-space-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">Signed in as {session.name}</CardTitle>
          <CardDescription className="break-words">{session.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-space-sm">
          <Badge variant="secondary">{session.role}</Badge>
          <Badge variant="outline">Verified against MongoDB</Badge>
        </CardContent>
      </Card>

      <section aria-labelledby="workspace-status-heading" className="space-y-space-md">
        <div className="space-y-space-xs">
          <p className="text-label-badge font-bold tracking-widest text-muted-foreground uppercase">
            Workspace
          </p>
          <h2 id="workspace-status-heading" className="font-display text-headline-md">
            What&rsquo;s live
          </h2>
        </div>

        <ul className="grid list-none grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3">
          {WORKSPACE_STATUS.map((status) => (
            <li key={status.label}>
              <StatusCard status={status} />
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">Next up</CardTitle>
          <CardDescription>
            Cargo codes are the next piece of work — the model, admin management, and the public
            lookup that depends on them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/admin/cargo"
            className="inline-flex min-h-11 items-center gap-space-xs rounded-lg text-body-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            Go to Cargo
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
