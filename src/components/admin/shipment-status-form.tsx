"use client";

import { useActionState, useState } from "react";

import { NativeSelect } from "@/components/admin/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toAmountInputValue } from "@/lib/format";
import {
  AMOUNT_STATUS,
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
  /** The charge already on record, pre-filled so an unchanged submit keeps it. */
  currentAmount?: number;
};

/**
 * Status changes are append-only — each submission adds a timeline entry rather
 * than overwriting a field — so the note explains *why* a shipment moved, which
 * is the part an operator cannot reconstruct later.
 */
export function ShipmentStatusForm({
  action,
  shipmentId,
  currentStatus,
  currentAmount,
}: ShipmentStatusFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  // Tracked so the amount field can follow the selection. Without JavaScript the
  // select still posts and the server still enforces the rule — the field is then
  // simply always rendered, which is why it is not hidden with CSS alone.
  const [status, setStatus] = useState<ShipmentStatus>(currentStatus);
  const showAmount = status === AMOUNT_STATUS;

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
        <NativeSelect
          id="status"
          name="status"
          defaultValue={currentStatus}
          onChange={(event) => setStatus(event.target.value as ShipmentStatus)}
        >
          {SHIPMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {SHIPMENT_STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
        {state?.fieldErrors?.status ? (
          <p className="text-label-sm text-destructive">{state.fieldErrors.status}</p>
        ) : null}
      </div>

      {/* Only a shipment held at customs carries a charge. The field is unmounted
          rather than hidden, so a stale value cannot post from a status that has
          no business having one. */}
      {showAmount ? (
        <div className="space-y-space-xs">
          <Label htmlFor="amount">
            Customs charge (USD)
            <span className="pl-1 font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            // Pre-filled with what is on record, so submitting unchanged keeps it
            // and clearing the box is how an operator removes a wrong figure.
            defaultValue={currentAmount === undefined ? "" : toAmountInputValue(currentAmount)}
            placeholder="0.00"
            className="min-h-11"
            aria-invalid={Boolean(state?.fieldErrors?.amount)}
            aria-describedby="amount-hint"
          />
          <p id="amount-hint" className="text-label-sm text-muted-foreground">
            Leave empty to record no charge.
          </p>
          {state?.fieldErrors?.amount ? (
            <p className="text-label-sm text-destructive">{state.fieldErrors.amount}</p>
          ) : null}
        </div>
      ) : null}

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
