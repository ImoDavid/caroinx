import type { FormState } from "@/lib/forms";

/**
 * Form-state types for the cargo actions, kept OUT of `actions.ts`.
 *
 * `actions.ts` carries the `"use server"` directive, and every export of such a
 * module is treated as a callable server reference. Importing the types from
 * here instead keeps the client form free of that module entirely.
 */

export type ShipmentField =
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
  // Not a key of shipmentCreateSchema — the photo is validated and uploaded
  // separately in the action — but it still needs somewhere to report an error.
  | "photo";

export type ShipmentFormState = FormState<ShipmentField>;
export type StatusFormState = FormState<"status" | "note" | "amount">;
export type DeleteFormState = FormState<"id">;
