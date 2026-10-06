import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ShipmentForm } from "@/components/admin/shipment-form";
import { requireAdmin } from "@/lib/auth/guards";
import { toDateInputValue } from "@/lib/format";
import { getShipmentById } from "@/services/shipment.service";
import { DEFAULT_COUNTRY } from "@/validations/shipment";

import { updateShipmentAction } from "../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/admin/cargo/[id]/edit">): Promise<Metadata> {
  const { id } = await params;
  const shipment = await getShipmentById(id);
  return { title: shipment ? `Edit ${shipment.trackingCode}` : "Edit shipment" };
}

export default async function EditShipmentPage({ params }: PageProps<"/admin/cargo/[id]/edit">) {
  // The security boundary for this page. The action re-verifies independently.
  await requireAdmin();

  const { id } = await params;
  const shipment = await getShipmentById(id);
  if (!shipment) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-space-lg">
      <div className="space-y-space-xs">
        <Link
          href={`/admin/cargo/${shipment.id}`}
          className="rounded text-body-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          ← Back to shipment
        </Link>
        <h2 className="font-display text-headline-md break-all">
          Edit <span className="font-mono">{shipment.trackingCode}</span>
        </h2>
        <p className="text-body-sm text-muted-foreground">
          The tracking code cannot be changed, and status has its own update on the shipment page so
          the history stays accurate.
        </p>
      </div>

      <ShipmentForm
        mode="edit"
        action={updateShipmentAction}
        shipmentId={shipment.id}
        // A photo can be added here if the shipment has none, but never replaced.
        hasPhoto={Boolean(shipment.photo)}
        cancelHref={`/admin/cargo/${shipment.id}`}
        submitLabel="Save changes"
        defaultValues={{
          sender: {
            name: shipment.sender.name,
            // Falls back for shipments predating the country field: saving the
            // edit is what backfills them.
            country: shipment.sender.country ?? DEFAULT_COUNTRY,
            location: shipment.sender.location,
            phone: shipment.sender.phone ?? "",
          },
          receiver: {
            name: shipment.receiver.name,
            country: shipment.receiver.country ?? DEFAULT_COUNTRY,
            location: shipment.receiver.location,
            phone: shipment.receiver.phone ?? "",
            email: shipment.receiver.email ?? "",
          },
          details: {
            transportType: shipment.transportType,
            weightKg: shipment.weightKg,
            shipDate: toDateInputValue(shipment.shipDate),
            expectedDelivery: shipment.expectedDelivery
              ? toDateInputValue(shipment.expectedDelivery)
              : "",
          },
          status: shipment.status,
        }}
      />
    </div>
  );
}
