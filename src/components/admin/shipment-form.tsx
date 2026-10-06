"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { CountrySelect } from "@/components/admin/country-select";
import { NativeSelect } from "@/components/admin/native-select";
import { PhotoUploadField } from "@/components/admin/photo-upload-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  TRANSPORT_TYPES,
  TRANSPORT_TYPE_LABELS,
  shipmentCreateSchema,
} from "@/validations/shipment";

import type { ShipmentFormState } from "@/app/admin/(dashboard)/cargo/form-state";

type Values = z.input<typeof shipmentCreateSchema>;

/**
 * Dotted names match the FormData keys the Server Action reads.
 *
 * Duplicated from `ShipmentField` in `cargo/form-state.ts` rather than imported,
 * and must be kept in sync with it — see the note there on why a client module
 * cannot reach into a `"use server"` file's siblings for a value.
 */
type FieldName =
  | "sender.name"
  | "sender.country"
  | "sender.location"
  | "sender.phone"
  | "receiver.name"
  | "receiver.country"
  | "receiver.location"
  | "receiver.phone"
  | "receiver.email"
  | "details.transportType"
  | "details.weightKg"
  | "details.shipDate"
  | "details.expectedDelivery"
  | "photo";

export type ShipmentFormProps = {
  action: (state: ShipmentFormState, formData: FormData) => Promise<ShipmentFormState>;
  mode: "create" | "edit";
  /** Present when editing; becomes the hidden `id` field. */
  shipmentId?: string;
  /**
   * Whether the shipment already carries a photo. A photo can be added once and
   * then never replaced, so this hides the upload field rather than pre-filling
   * it — a file input cannot be pre-filled anyway.
   */
  hasPhoto?: boolean;
  defaultValues: Values;
  cancelHref: string;
  submitLabel: string;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-space-md sm:p-space-lg">
      <legend className="px-1 font-display text-title-sm font-bold">{title}</legend>
      <p className="pb-space-md text-body-sm text-muted-foreground">{description}</p>
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function FieldShell({
  name,
  label,
  optional,
  error,
  className,
  children,
}: {
  name: FieldName;
  label: string;
  optional?: boolean;
  error?: string;
  className?: string;
  children: (describedBy: string | undefined) => React.ReactNode;
}) {
  const errorId = `${name}-error`;

  return (
    <div className={cn("space-y-space-xs", className)}>
      <Label htmlFor={name}>
        {label}
        {optional ? (
          <span className="pl-1 font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </Label>
      {children(error ? errorId : undefined)}
      {error ? (
        <p id={errorId} className="text-label-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL = "min-h-11";

export function ShipmentForm({
  action,
  mode,
  shipmentId,
  hasPhoto = false,
  defaultValues,
  cancelHref,
  submitLabel,
}: ShipmentFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  // React Hook Form decorates the form with immediate per-field feedback;
  // useActionState owns the server round-trip. `handleSubmit` is deliberately
  // NOT used, so the form posts real FormData and still works without
  // JavaScript — the same arrangement as the login form.
  const {
    register,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(shipmentCreateSchema),
    mode: "onBlur",
    defaultValues,
  });

  /**
   * Client-side message wins; the server's is the fallback after a round-trip.
   *
   * Typed structurally rather than as `FieldError`: for the coerced number and
   * date fields RHF widens the error to `Merge<FieldError, FieldErrorsImpl<…>>`,
   * and `message` is the only part this needs.
   */
  const errorFor = (
    name: FieldName,
    clientError: { message?: string } | undefined,
  ): string | undefined => clientError?.message ?? state?.fieldErrors?.[name];

  return (
    // encType is load-bearing for the no-JavaScript path: React encodes Server
    // Action submissions itself, so a missing encType is invisible with JS on,
    // but a native POST would send only the file's NAME, not its bytes.
    <form action={formAction} encType="multipart/form-data" className="space-y-space-lg" noValidate>
      {shipmentId ? <input type="hidden" name="id" value={shipmentId} /> : null}

      {state?.status === "error" && !state.fieldErrors ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Section title="Sender information" description="Who the consignment is collected from.">
        <FieldShell
          name="sender.name"
          label="Name"
          error={errorFor("sender.name", errors.sender?.name)}
        >
          {(describedBy) => (
            <Input
              id="sender.name"
              autoComplete="off"
              className={CONTROL}
              aria-invalid={Boolean(errorFor("sender.name", errors.sender?.name))}
              aria-describedby={describedBy}
              {...register("sender.name")}
            />
          )}
        </FieldShell>

        <FieldShell
          name="sender.phone"
          label="Phone"
          optional
          error={errorFor("sender.phone", errors.sender?.phone)}
        >
          {(describedBy) => (
            <Input
              id="sender.phone"
              type="tel"
              autoComplete="off"
              className={CONTROL}
              aria-describedby={describedBy}
              {...register("sender.phone")}
            />
          )}
        </FieldShell>

        <FieldShell
          name="sender.country"
          label="Country"
          error={errorFor("sender.country", errors.sender?.country)}
        >
          {(describedBy) => (
            <CountrySelect
              id="sender.country"
              aria-invalid={Boolean(errorFor("sender.country", errors.sender?.country))}
              aria-describedby={describedBy}
              {...register("sender.country")}
            />
          )}
        </FieldShell>

        <FieldShell
          name="sender.location"
          label="City or address"
          error={errorFor("sender.location", errors.sender?.location)}
        >
          {(describedBy) => (
            <Input
              id="sender.location"
              autoComplete="off"
              placeholder="e.g. Lagos"
              className={CONTROL}
              aria-invalid={Boolean(errorFor("sender.location", errors.sender?.location))}
              aria-describedby={describedBy}
              {...register("sender.location")}
            />
          )}
        </FieldShell>
      </Section>

      <Section title="Receiver information" description="Who the consignment is delivered to.">
        <FieldShell
          name="receiver.name"
          label="Name"
          error={errorFor("receiver.name", errors.receiver?.name)}
        >
          {(describedBy) => (
            <Input
              id="receiver.name"
              autoComplete="off"
              className={CONTROL}
              aria-invalid={Boolean(errorFor("receiver.name", errors.receiver?.name))}
              aria-describedby={describedBy}
              {...register("receiver.name")}
            />
          )}
        </FieldShell>

        <FieldShell
          name="receiver.phone"
          label="Phone"
          optional
          error={errorFor("receiver.phone", errors.receiver?.phone)}
        >
          {(describedBy) => (
            <Input
              id="receiver.phone"
              type="tel"
              autoComplete="off"
              className={CONTROL}
              aria-describedby={describedBy}
              {...register("receiver.phone")}
            />
          )}
        </FieldShell>

        <FieldShell
          name="receiver.email"
          label="Email"
          optional
          error={errorFor("receiver.email", errors.receiver?.email)}
        >
          {(describedBy) => (
            <Input
              id="receiver.email"
              type="email"
              autoComplete="off"
              className={CONTROL}
              aria-invalid={Boolean(errorFor("receiver.email", errors.receiver?.email))}
              aria-describedby={describedBy}
              {...register("receiver.email")}
            />
          )}
        </FieldShell>

        <FieldShell
          name="receiver.country"
          label="Country"
          error={errorFor("receiver.country", errors.receiver?.country)}
        >
          {(describedBy) => (
            <CountrySelect
              id="receiver.country"
              aria-invalid={Boolean(errorFor("receiver.country", errors.receiver?.country))}
              aria-describedby={describedBy}
              {...register("receiver.country")}
            />
          )}
        </FieldShell>

        <FieldShell
          name="receiver.location"
          label="City or address"
          error={errorFor("receiver.location", errors.receiver?.location)}
        >
          {(describedBy) => (
            <Input
              id="receiver.location"
              autoComplete="off"
              placeholder="e.g. Accra"
              className={CONTROL}
              aria-invalid={Boolean(errorFor("receiver.location", errors.receiver?.location))}
              aria-describedby={describedBy}
              {...register("receiver.location")}
            />
          )}
        </FieldShell>
      </Section>

      <Section title="Shipment details" description="How and when the consignment moves.">
        <FieldShell
          name="details.transportType"
          label="Transport type"
          error={errorFor("details.transportType", errors.details?.transportType)}
        >
          {(describedBy) => (
            <NativeSelect
              id="details.transportType"
              aria-describedby={describedBy}
              {...register("details.transportType")}
            >
              {TRANSPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TRANSPORT_TYPE_LABELS[type]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FieldShell>

        <FieldShell
          name="details.weightKg"
          label="Weight (kg)"
          error={errorFor("details.weightKg", errors.details?.weightKg)}
        >
          {(describedBy) => (
            <Input
              id="details.weightKg"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className={CONTROL}
              aria-invalid={Boolean(errorFor("details.weightKg", errors.details?.weightKg))}
              aria-describedby={describedBy}
              {...register("details.weightKg")}
            />
          )}
        </FieldShell>

        <FieldShell
          name="details.shipDate"
          label="Shipping date"
          error={errorFor("details.shipDate", errors.details?.shipDate)}
        >
          {(describedBy) => (
            <Input
              id="details.shipDate"
              type="date"
              className={CONTROL}
              aria-invalid={Boolean(errorFor("details.shipDate", errors.details?.shipDate))}
              aria-describedby={describedBy}
              {...register("details.shipDate")}
            />
          )}
        </FieldShell>

        <FieldShell
          name="details.expectedDelivery"
          label="Expected delivery"
          optional
          error={errorFor("details.expectedDelivery", errors.details?.expectedDelivery)}
        >
          {(describedBy) => (
            <Input
              id="details.expectedDelivery"
              type="date"
              className={CONTROL}
              aria-invalid={Boolean(
                errorFor("details.expectedDelivery", errors.details?.expectedDelivery),
              )}
              aria-describedby={describedBy}
              {...register("details.expectedDelivery")}
            />
          )}
        </FieldShell>

        {/* A photo can be ADDED once and then never changed, so the field appears
            only while there is nothing to overwrite. That is also what removes the
            ambiguity a file input otherwise has when editing: it cannot be
            pre-filled, so "keep" and "remove" would be indistinguishable in a
            no-JavaScript POST. The service enforces the same rule — the absent
            field is UI, and a Server Action is a public endpoint. */}
        {hasPhoto ? (
          <p className="text-body-sm text-muted-foreground sm:col-span-2">
            This shipment already has a photo, and it cannot be replaced — the record is the
            evidence of what was consigned.
          </p>
        ) : (
          <FieldShell
            name="photo"
            label="Shipment photo"
            optional
            className="sm:col-span-2"
            error={errorFor("photo", undefined)}
          >
            {(describedBy) => (
              // No register(): "photo" is not a key of shipmentCreateSchema, and
              // React Hook Form cannot control a file input's value anyway. The
              // plain name attribute is what puts the file into the FormData.
              <PhotoUploadField
                id="photo"
                name="photo"
                describedBy={describedBy}
                invalid={Boolean(errorFor("photo", undefined))}
              />
            )}
          </FieldShell>
        )}
      </Section>

      {/* Editing never changes status — that has its own audited flow on the
          shipment page, which records who changed it and when. */}
      {mode === "create" ? (
        <Section title="Shipment status" description="Where the consignment starts its journey.">
          <div className="space-y-space-xs sm:col-span-2">
            <Label htmlFor="status">Initial status</Label>
            <NativeSelect id="status" {...register("status")}>
              {SHIPMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SHIPMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </Section>
      ) : null}

      <div className="flex flex-wrap items-center gap-space-sm">
        <Button type="submit" size="lg" disabled={isPending} className="min-h-11">
          {isPending ? "Saving…" : submitLabel}
        </Button>
        <Button asChild variant="outline" size="lg" className="min-h-11">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
