import type { Metadata } from "next";
import { ChevronRight, Package, Plus } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/admin/copy-button";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ShipmentFilters } from "@/components/admin/shipment-filters";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDate, formatWeight } from "@/lib/format";
import { listShipments } from "@/services/shipment.service";
import type { ShipmentSummary } from "@/types/shipment";
import { shipmentListQuerySchema, TRANSPORT_TYPE_LABELS } from "@/validations/shipment";

// Per-administrator and session-dependent: never prerendered or cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cargo",
};

const COLUMNS: readonly DataTableColumn<ShipmentSummary>[] = [
  {
    id: "trackingCode",
    header: "Tracking code",
    cell: (shipment) => (
      <span className="flex items-center gap-1">
        <Link
          href={`/admin/cargo/${shipment.id}`}
          className="rounded font-mono font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          {shipment.trackingCode}
        </Link>
        <CopyButton
          value={shipment.trackingCode}
          label={`Copy tracking code ${shipment.trackingCode}`}
        />
      </span>
    ),
  },
  {
    id: "createdAt",
    header: "Created",
    cell: (shipment) => (
      <time dateTime={shipment.createdAt} className="whitespace-nowrap">
        {formatDate(shipment.createdAt)}
      </time>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (shipment) => <StatusBadge status={shipment.status} />,
  },
  {
    id: "route",
    header: "Sender → Receiver",
    cell: (shipment) => (
      <span className="block min-w-48 break-words">
        {shipment.senderName} <span aria-hidden="true">→</span> <span className="sr-only">to</span>
        {shipment.receiverName}
      </span>
    ),
  },
  {
    id: "transport",
    header: "Transport",
    cell: (shipment) => (
      <span className="whitespace-nowrap">
        {TRANSPORT_TYPE_LABELS[shipment.transportType]} · {formatWeight(shipment.weightKg)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    srOnlyHeader: true,
    className: "text-right",
    cell: (shipment) => (
      <Link
        href={`/admin/cargo/${shipment.id}`}
        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-body-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      >
        View
        <ChevronRight className="size-4" aria-hidden="true" />
        <span className="sr-only">shipment {shipment.trackingCode}</span>
      </Link>
    ),
  },
];

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-space-xl text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-foreground"
      >
        <Package className="size-6" />
      </span>
      <h3 className="pt-space-sm font-display text-title-sm font-bold">
        {filtered ? "No shipments match those filters" : "No shipments yet"}
      </h3>
      <p className="pt-space-xs text-body-sm text-muted-foreground">
        {filtered
          ? "Try a different tracking code, name, or status."
          : "Create the first shipment and its tracking code will be generated automatically."}
      </p>
      {!filtered ? (
        <Button asChild size="lg" className="mt-space-md min-h-11">
          <Link href="/admin/cargo/new">
            <Plus className="size-4" aria-hidden="true" />
            New shipment
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
    if (target > 1) search.set("page", String(target));
    const queryString = search.toString();
    return queryString ? `/admin/cargo?${queryString}` : "/admin/cargo";
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-space-sm"
    >
      <p className="text-body-sm text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-space-sm">
        {page > 1 ? (
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href={href(page - 1)} rel="prev">
              Previous
            </Link>
          </Button>
        ) : null}
        {page < pageCount ? (
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href={href(page + 1)} rel="next">
              Next
            </Link>
          </Button>
        ) : null}
      </div>
    </nav>
  );
}

export default async function CargoListPage({ searchParams }: PageProps<"/admin/cargo">) {
  // The security boundary for this page.
  await requireAdmin();

  const raw = await searchParams;
  // Search params are attacker-controlled; the schema `.catch()`es every field
  // so a hand-edited query string renders page 1 rather than an error.
  const query = shipmentListQuerySchema.parse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });

  const { items, total, page, pageCount } = await listShipments(query);
  const filtered = Boolean(query.q ?? query.status);

  return (
    <div className="space-y-space-lg">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <h2 className="font-display text-headline-md">Shipments</h2>
        <Button asChild size="lg" className="min-h-11">
          <Link href="/admin/cargo/new">
            <Plus className="size-4" aria-hidden="true" />
            New shipment
          </Link>
        </Button>
      </div>

      <ShipmentFilters total={total} />

      <DataTable
        caption="Shipments, newest first"
        columns={COLUMNS}
        rows={items}
        getRowKey={(shipment) => shipment.id}
        empty={<EmptyState filtered={filtered} />}
      />

      <Pagination page={page} pageCount={pageCount} params={{ q: query.q, status: query.status }} />
    </div>
  );
}
