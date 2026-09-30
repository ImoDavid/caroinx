import type { Metadata } from "next";
import Link from "next/link";

import { ShipmentForm } from "@/components/admin/shipment-form";
import { requireAdmin } from "@/lib/auth/guards";
import { toDateInputValue } from "@/lib/format";
import { DEFAULT_SHIPMENT_STATUS } from "@/validations/shipment";

import { createShipmentAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New shipment",
};

export default async function NewShipmentPage() {
  // The security boundary for this page. The action re-verifies independently.
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-space-lg">
      <div className="space-y-space-xs">
        <Link
          href="/admin/cargo"
          className="rounded text-body-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          ← Back to shipments
        </Link>
        <h2 className="font-display text-headline-md">New shipment</h2>
        <p className="text-body-sm text-muted-foreground">
          The tracking code is generated automatically once you save.
        </p>
      </div>

      <ShipmentForm
        mode="create"
        action={createShipmentAction}
        cancelHref="/admin/cargo"
        submitLabel="Create shipment"
        defaultValues={{
          sender: { name: "", location: "", phone: "" },
          receiver: { name: "", location: "", phone: "", email: "" },
          details: {
            transportType: "air",
            weightKg: "",
            // Defaults to today: the overwhelmingly common case is booking a
            // shipment on the day it moves.
            shipDate: toDateInputValue(new Date().toISOString()),
          },
          status: DEFAULT_SHIPMENT_STATUS,
        }}
      />
    </div>
  );
}
