import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/admin/copy-button";
import { CountryLabel } from "@/components/admin/country-label";
import { DeleteShipmentForm } from "@/components/admin/delete-shipment-form";
import { ShipmentPhotoView } from "@/components/admin/shipment-photo";
import { ShipmentStatusForm } from "@/components/admin/shipment-status-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusTimeline } from "@/components/admin/status-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { formatAmount, formatDate, formatWeight } from "@/lib/format";
import { getShipmentById } from "@/services/shipment.service";
import { TRANSPORT_TYPE_LABELS } from "@/validations/shipment";

import { deleteShipmentAction, updateShipmentStatusAction } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/admin/cargo/[id]">): Promise<Metadata> {
  const { id } = await params;
  const shipment = await getShipmentById(id);
  return { title: shipment ? shipment.trackingCode : "Shipment" };
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-space-sm">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="text-body-sm break-words">{value}</dd>
    </div>
  );
}

export default async function ShipmentDetailPage({ params }: PageProps<"/admin/cargo/[id]">) {
  // The security boundary for this page.
  await requireAdmin();

  const { id } = await params;
  const shipment = await getShipmentById(id);

  // Covers both a malformed ObjectId and a deleted record — the service returns
  // null for each, so a bad id is a 404 rather than a crash.
  if (!shipment) notFound();

  return (
    <div className="space-y-space-lg">
      <div className="space-y-space-xs">
        <Link
          href="/admin/cargo"
          className="rounded text-body-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          ← Back to shipments
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex min-w-0 items-center gap-1">
            <h2 className="font-display font-mono text-headline-md break-all">
              {shipment.trackingCode}
            </h2>
            <CopyButton
              value={shipment.trackingCode}
              label={`Copy tracking code ${shipment.trackingCode}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <StatusBadge status={shipment.status} />
            <Button asChild variant="outline" size="lg" className="min-h-11">
              <Link href={`/admin/cargo/${shipment.id}/edit`}>
                <Pencil className="size-4" aria-hidden="true" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="space-y-space-lg lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Sender</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-space-sm">
                <DetailRow label="Name" value={shipment.sender.name} />
                <DetailRow
                  label="Country"
                  value={<CountryLabel code={shipment.sender.country} />}
                />
                <DetailRow label="City or address" value={shipment.sender.location} />
                <DetailRow label="Phone" value={shipment.sender.phone ?? "—"} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Receiver</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-space-sm">
                <DetailRow label="Name" value={shipment.receiver.name} />
                <DetailRow
                  label="Country"
                  value={<CountryLabel code={shipment.receiver.country} />}
                />
                <DetailRow label="City or address" value={shipment.receiver.location} />
                <DetailRow label="Phone" value={shipment.receiver.phone ?? "—"} />
                <DetailRow
                  label="Email"
                  value={
                    shipment.receiver.email ? (
                      <a
                        href={`mailto:${shipment.receiver.email}`}
                        className="rounded underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                      >
                        {shipment.receiver.email}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Shipment details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-space-sm">
                <DetailRow
                  label="Transport"
                  value={TRANSPORT_TYPE_LABELS[shipment.transportType]}
                />
                <DetailRow label="Weight" value={formatWeight(shipment.weightKg)} />
                <DetailRow
                  label="Shipping date"
                  value={<time dateTime={shipment.shipDate}>{formatDate(shipment.shipDate)}</time>}
                />
                {/* Omitted rather than em-dashed when unset: an arrival date is
                    genuinely optional, and this row is what the public tracking
                    page mirrors. */}
                {shipment.expectedDelivery ? (
                  <DetailRow
                    label="Expected delivery"
                    value={
                      <time dateTime={shipment.expectedDelivery}>
                        {formatDate(shipment.expectedDelivery)}
                      </time>
                    }
                  />
                ) : null}
                <DetailRow
                  label="Created"
                  value={
                    <time dateTime={shipment.createdAt}>{formatDate(shipment.createdAt)}</time>
                  }
                />
                {/* Only rendered when there is one: an em dash here would imply
                    every shipment ought to have a customs charge. */}
                {shipment.amount !== undefined ? (
                  <DetailRow label="Customs charge" value={formatAmount(shipment.amount)} />
                ) : null}
              </dl>
            </CardContent>
          </Card>

          {/* In the wide column, not the narrow one: a photo in the sidebar would
              render postage-stamp sized. */}
          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <ShipmentPhotoView photo={shipment.photo} trackingCode={shipment.trackingCode} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-space-lg">
          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Update status</CardTitle>
            </CardHeader>
            <CardContent>
              <ShipmentStatusForm
                action={updateShipmentStatusAction}
                shipmentId={shipment.id}
                currentStatus={shipment.status}
                currentAmount={shipment.amount}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">History</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline events={shipment.statusHistory} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteShipmentForm
                action={deleteShipmentAction}
                shipmentId={shipment.id}
                trackingCode={shipment.trackingCode}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
