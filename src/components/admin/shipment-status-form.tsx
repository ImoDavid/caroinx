"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  STATUS_NOTE_MAX,
  type ShipmentStatus,
} from "@/validations/shipment";

import type { StatusFormState } from "@/app/admin/(dashboard)/cargo/form-state";

export type ShipmentStatusFormProps = {
  action: (state: StatusFormState, formData: FormData) => Promise<StatusFormState>;
  shipmentId: string;
  currentStatus: ShipmentStatus;
};

/**
 * Status changes are append-only — each submission adds a timeline entry rather
 * than overwriting a field — so the note explains *why* a shipment moved, which
 * is the part an operator cannot reconstruct later.
 */
export function ShipmentStatusForm({ action, shipmentId, currentStatus }: ShipmentStatusFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-space-md">
      <input type="hidden" name="id" value={shipmentId} />

      {state?.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-space-xs">
        <Label htmlFor="status">Move to</Label>
        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          className={cn(
            "min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:text-sm dark:bg-input/30",
          )}
        >
          {SHIPMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {SHIPMENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-space-xs">
        <Label htmlFor="note">
          Note <span className="pl-1 font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="note"
          name="note"
          rows={2}
          maxLength={STATUS_NOTE_MAX}
          placeholder="e.g. Held pending customs paperwork"
        />
        {state?.fieldErrors?.note ? (
          <p className="text-label-sm text-destructive">{state.fieldErrors.note}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={isPending} className="min-h-11 w-full sm:w-auto">
        {isPending ? "Updating…" : "Update status"}
      </Button>
    </form>
  );
}
