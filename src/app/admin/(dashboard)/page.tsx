import { Suspense } from "react";
import { cache } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Package,
  Plus,
  Search,
  ShieldAlert,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/admin/empty-state";
import { MetricTiles, MetricTilesSkeleton, type MetricTile } from "@/components/admin/metric-tiles";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusBarChart } from "@/components/admin/status-bar-chart";
import { TrendChart } from "@/components/admin/trend-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth/guards";
import { formatAmount, formatDateTime } from "@/lib/format";
import { listConversations } from "@/services/chat.service";
import { getAdminMetrics, TREND_DAYS } from "@/services/metrics.service";
import { listShipments } from "@/services/shipment.service";

export const dynamic = "force-dynamic";

/**
 * The admin Overview.
 *
 * Every number on this page is a real count of a stored field. The previous
 * version was a hardcoded "what's live" table that had gone stale — it still
 * claimed the cargo module and the public lookup were unbuilt.
 *
 * Each band is its own `<Suspense>` boundary, so the shell and the headings
 * paint immediately and the data streams in behind skeletons. `cache()` is what
 * makes that affordable: all three metric bands await ONE aggregate, the same
 * trick `verifySession()` uses to share a session read across a render pass.
 */
const metrics = cache(getAdminMetrics);

/* -------------------------------------------------------------------------- */
/* Bands                                                                       */
/* -------------------------------------------------------------------------- */

async function KeyMetrics() {
  const { shipments, conversations } = await metrics();

  const inTransit = shipments.byStatus
    .filter((entry) => entry.status === "picked_by_courier" || entry.status === "on_the_way")
    .reduce((sum, entry) => sum + entry.count, 0);

  const tiles: readonly MetricTile[] = [
    {
      label: "Consignments",
      value: shipments.total,
      hint: "Every shipment on record",
      icon: Package,
      href: "/admin/cargo",
    },
    {
      label: "In transit",
      value: inTransit,
      hint: "Collected or on the way",
      icon: Truck,
      href: "/admin/cargo?status=on_the_way",
    },
    {
      label: "Held at customs",
      value: shipments.heldCount,
      hint:
        shipments.heldAmount > 0
          ? `${formatAmount(shipments.heldAmount)} levied`
          : "No charges recorded",
      icon: ShieldAlert,
      href: "/admin/cargo?status=customs_held",
    },
    {
      label: "Open chats",
      value: conversations.open,
      hint:
        conversations.unread > 0
          ? `${String(conversations.unread)} with unread messages`
          : "All caught up",
      icon: MessageSquare,
      href: "/admin/inbox",
    },
  ];

  return <MetricTiles tiles={tiles} />;
}

type AttentionRow = {
  label: string;
  count: number;
  detail: string;
  href: string;
  cta: string;
};

async function NeedsAttention() {
  const { shipments, conversations } = await metrics();

  const rows: AttentionRow[] = [];

  if (conversations.unread > 0) {
    rows.push({
      label: "Unread conversations",
      count: conversations.unread,
      detail: "A visitor is waiting for a reply.",
      href: "/admin/inbox?unread=1",
      cta: "Open inbox",
    });
  }

  if (shipments.heldCount > 0) {
    rows.push({
      label: "Held at customs",
      count: shipments.heldCount,
      detail:
        shipments.heldAmount > 0
          ? `${formatAmount(shipments.heldAmount)} levied in total.`
          : "No clearance charge has been recorded yet.",
      href: "/admin/cargo?status=customs_held",
      cta: "Review holds",
    });
  }

  if (shipments.overdueCount > 0) {
    rows.push({
      label: "Past expected delivery",
      count: shipments.overdueCount,
      detail: "Expected delivery has passed and the status is not Delivered.",
      href: "/admin/cargo",
      cta: "Open cargo",
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-card p-space-md text-body-sm text-muted-foreground ring-1 ring-foreground/10">
        Nothing needs attention — no unread conversations, customs holds, or overdue consignments.
      </p>
    );
  }

  return (
    <ul className="grid list-none grid-cols-1 gap-space-sm md:grid-cols-3 md:gap-gutter">
      {rows.map((row) => (
        <li key={row.label}>
          <Link
            href={row.href}
            className="flex h-full min-h-11 flex-col gap-space-xs rounded-2xl bg-card p-space-md ring-1 ring-foreground/10 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <span className="flex items-center gap-space-xs text-muted-foreground">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate text-label-sm font-medium">{row.label}</span>
            </span>
            <span className="font-display text-headline-md-mobile font-bold tabular-nums">
              {row.count}
            </span>
            <span className="text-label-sm text-pretty text-muted-foreground">{row.detail}</span>
            <span className="inline-flex items-center gap-1 pt-space-xs text-label-sm font-semibold text-primary">
              {row.cta}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function Trends() {
  const { shipments } = await metrics();

  const hasShipments = shipments.total > 0;

  return (
    <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">Consignments created</CardTitle>
          <CardDescription>Last {TREND_DAYS} days, UTC</CardDescription>
        </CardHeader>
        <CardContent>
          {hasShipments ? (
            <TrendChart
              series={shipments.createdDaily}
              caption={`Consignments created per day over the last ${String(TREND_DAYS)} days`}
            />
          ) : (
            <p className="py-space-lg text-center text-body-sm text-muted-foreground">
              No shipments recorded yet, so there is no trend to show.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">Pipeline</CardTitle>
          <CardDescription>Where every consignment sits right now</CardDescription>
        </CardHeader>
        <CardContent>
          {hasShipments ? (
            <StatusBarChart
              counts={shipments.byStatus}
              caption="Number of consignments at each status"
            />
          ) : (
            <p className="py-space-lg text-center text-body-sm text-muted-foreground">
              No shipments recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type ActivityItem = {
  key: string;
  at: string;
  href: string;
  title: string;
  detail: string;
  badge: React.ReactNode;
};

async function RecentActivity() {
  // Reuses the existing list queries rather than adding a third read path —
  // both already sort newest-first, so the newest page is the only one needed.
  const [shipmentPage, conversationPage] = await Promise.all([
    listShipments({ page: 1, q: undefined, status: undefined }),
    // `unread` is `true | undefined`, never `false` — the schema models the
    // filter as absent rather than off, so `?unread=0` cannot enable it.
    listConversations({ page: 1, q: undefined, status: undefined, unread: undefined }),
  ]);

  const items: ActivityItem[] = [
    ...shipmentPage.items.map((shipment) => ({
      key: `shipment-${shipment.id}`,
      at: shipment.createdAt,
      href: `/admin/cargo/${shipment.id}`,
      title: shipment.trackingCode,
      detail: `${shipment.senderName} → ${shipment.receiverName}`,
      badge: <StatusBadge status={shipment.status} />,
    })),
    ...conversationPage.items.map((conversation) => ({
      key: `chat-${conversation.id}`,
      at: conversation.lastMessageAt,
      href: `/admin/inbox/${conversation.id}`,
      title: conversation.visitorName,
      detail: conversation.lastMessagePreview ?? "No messages yet",
      badge: (
        <span className="inline-flex items-center gap-1 text-label-sm text-muted-foreground">
          <MessageSquare className="size-3.5" aria-hidden="true" />
          Chat
        </span>
      ),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Nothing has happened yet"
        description="Consignments you create and conversations visitors start will appear here, newest first."
      >
        <Button asChild size="lg" className="min-h-11">
          <Link href="/admin/cargo/new">
            <Plus className="size-4" aria-hidden="true" />
            New shipment
          </Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-space-sm">
      {items.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className="flex min-h-11 flex-col gap-space-xs rounded-2xl bg-card p-space-md ring-1 ring-foreground/10 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            {/* flex-wrap so this reflows at 320px rather than overflowing. */}
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="min-w-0 font-display text-body-base font-bold break-all">
                {item.title}
              </span>
              {item.badge}
            </div>
            <p className="line-clamp-2 text-body-sm text-muted-foreground">{item.detail}</p>
            <time dateTime={item.at} className="text-label-sm text-muted-foreground">
              {formatDateTime(item.at)}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeletons — each matches its band's geometry so nothing reflows on arrival   */
/* -------------------------------------------------------------------------- */

function RowsSkeleton({ rows, height }: { rows: number; height: string }) {
  return (
    <div className="space-y-space-sm">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={height} />
      ))}
    </div>
  );
}

function SectionHeading({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div className="space-y-space-xs">
      {/* The topbar owns the single <h1>, so pages start at <h2>. */}
      <h2 id={id} className="font-display text-headline-md-mobile md:text-headline-md">
        {title}
      </h2>
      {hint ? <p className="text-body-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export default async function AdminOverviewPage() {
  // The security boundary for this page.
  await requireAdmin();

  return (
    <div className="space-y-space-lg md:space-y-space-xl">
      {/* Quick actions sit first because on a phone they are what the admin
          most often came to do. Horizontally scrollable at 320 rather than a
          stack of full-width buttons that would push every metric below the
          fold — responsive rule 2's escape hatch, on its own container. */}
      <nav aria-label="Quick actions" className="-mx-margin overflow-x-auto px-margin">
        <ul className="flex w-max list-none items-center gap-space-sm">
          <li>
            <Button asChild size="lg" className="min-h-11">
              <Link href="/admin/cargo/new">
                <Plus className="size-4" aria-hidden="true" />
                New shipment
              </Link>
            </Button>
          </li>
          <li>
            <Button asChild variant="outline" size="lg" className="min-h-11">
              <Link href="/admin/inbox">
                <Inbox className="size-4" aria-hidden="true" />
                Inbox
              </Link>
            </Button>
          </li>
          <li>
            <Button asChild variant="outline" size="lg" className="min-h-11">
              <Link href="/admin/cargo">
                <Package className="size-4" aria-hidden="true" />
                All cargo
              </Link>
            </Button>
          </li>
          <li>
            <Button asChild variant="outline" size="lg" className="min-h-11">
              <Link href="/track">
                <Search className="size-4" aria-hidden="true" />
                Track a code
              </Link>
            </Button>
          </li>
        </ul>
      </nav>

      <section aria-labelledby="key-metrics-heading" className="space-y-space-md">
        <SectionHeading id="key-metrics-heading" title="At a glance" />
        <Suspense fallback={<MetricTilesSkeleton />}>
          <KeyMetrics />
        </Suspense>
      </section>

      <section aria-labelledby="attention-heading" className="space-y-space-md">
        <SectionHeading id="attention-heading" title="Needs attention" />
        <Suspense fallback={<RowsSkeleton rows={1} height="h-28" />}>
          <NeedsAttention />
        </Suspense>
      </section>

      <section aria-labelledby="trends-heading" className="space-y-space-md">
        <SectionHeading id="trends-heading" title="Trends" />
        <Suspense fallback={<RowsSkeleton rows={1} height="h-64" />}>
          <Trends />
        </Suspense>
      </section>

      <section aria-labelledby="activity-heading" className="space-y-space-md">
        <SectionHeading
          id="activity-heading"
          title="Recent activity"
          hint="Newest consignments and conversations."
        />
        <Suspense fallback={<RowsSkeleton rows={4} height="h-24" />}>
          <RecentActivity />
        </Suspense>
      </section>

      {/* Deliberately no "last updated" stamp: this page is force-dynamic and
          fresh on every visit, so a timestamp would only ever say "now" and
          imply a polling behaviour that does not exist (CLAUDE.md gap 36). */}
    </div>
  );
}
