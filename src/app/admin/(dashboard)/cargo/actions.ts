"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/guards";
import { fieldErrorsFrom } from "@/lib/forms";
import { logger } from "@/lib/logger";
import {
  createShipment,
  deleteShipment,
  updateShipment,
  updateShipmentStatus,
} from "@/services/shipment.service";
import {
  shipmentCreateSchema,
  shipmentStatusUpdateSchema,
  shipmentUpdateSchema,
} from "@/validations/shipment";

import type {
  DeleteFormState,
  ShipmentField,
  ShipmentFormState,
  StatusFormState,
} from "./form-state";

/**
 * Every action here re-verifies with `requireAdmin()`.
 *
 * A Server Action is a public POST endpoint: rendering its form on an
 * authenticated page is not a security boundary, so the check cannot be
 * inherited from the page that rendered the form.
 */

const UNEXPECTED = "Something went wrong. Please try again.";

/** FormData gives "" for an untouched input; the schemas treat "" as absent. */
function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function shipmentPayload(formData: FormData) {
  return {
    sender: {
      name: text(formData, "sender.name") ?? "",
      location: text(formData, "sender.location") ?? "",
      phone: text(formData, "sender.phone"),
    },
    receiver: {
      name: text(formData, "receiver.name") ?? "",
      location: text(formData, "receiver.location") ?? "",
      phone: text(formData, "receiver.phone"),
      email: text(formData, "receiver.email"),
    },
    details: {
      transportType: text(formData, "details.transportType"),
      weightKg: text(formData, "details.weightKg"),
      shipDate: text(formData, "details.shipDate"),
    },
  };
}

/** Zod reports nested paths as ["sender","name"]; the form names them "sender.name". */
function nestedFieldErrors(error: Parameters<typeof fieldErrorsFrom>[0]) {
  const result: Partial<Record<ShipmentField, string>> = {};
  for (const issue of error.issues) {
    const path = issue.path.filter((part) => typeof part === "string").join(".") as ShipmentField;
    if (path) result[path] ??= issue.message;
  }
  return result;
}

export async function createShipmentAction(
  _previous: ShipmentFormState,
  formData: FormData,
): Promise<ShipmentFormState> {
  const session = await requireAdmin();

  const parsed = shipmentCreateSchema.safeParse(shipmentPayload(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: nestedFieldErrors(parsed.error),
    };
  }

  let trackingCode: string;
  try {
    const created = await createShipment(parsed.data, session.userId);
    trackingCode = created.trackingCode;
  } catch (error) {
    logger.error("shipment create failed", { error, userId: session.userId });
    return { status: "error", message: UNEXPECTED };
  }

  revalidatePath("/admin/cargo");
  // Outside the try/catch so NEXT_REDIRECT is not swallowed as an error.
  redirect(`/admin/cargo?created=${trackingCode}`);
}

export async function updateShipmentAction(
  _previous: ShipmentFormState,
  formData: FormData,
): Promise<ShipmentFormState> {
  const session = await requireAdmin();

  const id = text(formData, "id") ?? "";
  const parsed = shipmentUpdateSchema.safeParse(shipmentPayload(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: nestedFieldErrors(parsed.error),
    };
  }

  try {
    const updated = await updateShipment(id, parsed.data);
    if (!updated) return { status: "error", message: "That shipment no longer exists." };
  } catch (error) {
    logger.error("shipment update failed", { error, userId: session.userId });
    return { status: "error", message: UNEXPECTED };
  }

  revalidatePath("/admin/cargo");
  revalidatePath(`/admin/cargo/${id}`);
  redirect(`/admin/cargo/${id}`);
}

export async function updateShipmentStatusAction(
  _previous: StatusFormState,
  formData: FormData,
): Promise<StatusFormState> {
  const session = await requireAdmin();

  const id = text(formData, "id") ?? "";
  const parsed = shipmentStatusUpdateSchema.safeParse({
    status: text(formData, "status"),
    note: text(formData, "note"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom<"status" | "note">(parsed.error),
    };
  }

  try {
    const updated = await updateShipmentStatus(id, parsed.data, session.userId);
    if (!updated) return { status: "error", message: "That shipment no longer exists." };
  } catch (error) {
    logger.error("shipment status update failed", { error, userId: session.userId });
    return { status: "error", message: UNEXPECTED };
  }

  revalidatePath("/admin/cargo");
  revalidatePath(`/admin/cargo/${id}`);
  return undefined;
}

export async function deleteShipmentAction(
  _previous: DeleteFormState,
  formData: FormData,
): Promise<DeleteFormState> {
  const session = await requireAdmin();

  const id = text(formData, "id") ?? "";

  try {
    const deleted = await deleteShipment(id);
    if (!deleted) return { status: "error", message: "That shipment no longer exists." };
  } catch (error) {
    logger.error("shipment delete failed", { error, userId: session.userId });
    return { status: "error", message: UNEXPECTED };
  }

  logger.info("shipment deleted", { shipmentId: id, userId: session.userId });
  revalidatePath("/admin/cargo");
  redirect("/admin/cargo?deleted=1");
}
