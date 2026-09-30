"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

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

/** Dotted names match the FormData keys the Server Action reads. */
type FieldName =
  | "sender.name"
  | "sender.location"
  | "sender.phone"
  | "receiver.name"
  | "receiver.location"
  | "receiver.phone"
  | "receiver.email"
  | "details.transportType"
  | "details.weightKg"
  | "details.shipDate";

export type ShipmentFormProps = {
  action: (state: ShipmentFormState, formData: FormData) => Promise<ShipmentFormState>;
  mode: "create" | "edit";
  /** Present when editing; becomes the hidden `id` field. */
  shipmentId?: string;
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
    <form action={formAction} className="space-y-space-lg" noValidate>
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
          name="sender.location"
          label="Location"
          className="sm:col-span-2"
          error={errorFor("sender.location", errors.sender?.location)}
        >
          {(describedBy) => (
            <Input
              id="sender.location"
              autoComplete="off"
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
          name="receiver.location"
          label="Location"
          error={errorFor("receiver.location", errors.receiver?.location)}
        >
          {(describedBy) => (
            <Input
              id="receiver.location"
              autoComplete="off"
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
            // A native <select> rather than the Radix one: it submits with the
            // form without JavaScript and needs no RHF Controller wrapper.
            <select
              id="details.transportType"
              className={cn(
                CONTROL,
                "w-full rounded-lg border border-input bg-transparent px-2.5 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:text-sm dark:bg-input/30",
              )}
              aria-describedby={describedBy}
              {...register("details.transportType")}
            >
              {TRANSPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TRANSPORT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
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
          className="sm:col-span-2"
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

        <p className="text-body-sm text-muted-foreground sm:col-span-2">
          A shipment photo will be added here once image hosting is configured.
        </p>
      </Section>

      {/* Editing never changes status — that has its own audited flow on the
          shipment page, which records who changed it and when. */}
      {mode === "create" ? (
        <Section title="Shipment status" description="Where the consignment starts its journey.">
          <div className="space-y-space-xs sm:col-span-2">
            <Label htmlFor="status">Initial status</Label>
            <select
              id="status"
              className={cn(
                CONTROL,
                "w-full rounded-lg border border-input bg-transparent px-2.5 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:text-sm dark:bg-input/30",
              )}
              {...register("status")}
            >
              {SHIPMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SHIPMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
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
