"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type { DeleteFormState } from "@/app/admin/(dashboard)/cargo/form-state";

export type DeleteShipmentFormProps = {
  action: (state: DeleteFormState, formData: FormData) => Promise<DeleteFormState>;
  shipmentId: string;
  trackingCode: string;
};

/**
 * Deletion is permanent and the record is what a customer looks up, so the
 * confirmation names the exact tracking code rather than asking a generic
 * "are you sure?".
 */
export function DeleteShipmentForm({ action, shipmentId, trackingCode }: DeleteShipmentFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <div className="space-y-space-sm">
      {state?.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="lg" className="min-h-11">
            <Trash2 className="size-4" aria-hidden="true" />
            Delete shipment
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {trackingCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the shipment and its status history. Anyone tracking{" "}
              {trackingCode} will no longer find it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep shipment</AlertDialogCancel>
            {/* The action lives on a form inside the dialog so the confirm button
                is a real submit — deletion is never a bare onClick. */}
            <form action={formAction}>
              <input type="hidden" name="id" value={shipmentId} />
              <AlertDialogAction type="submit" disabled={isPending} className="min-h-11 w-full">
                {isPending ? "Deleting…" : "Delete permanently"}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
