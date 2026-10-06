"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/guards";
import { uploadShipmentPhoto } from "@/lib/cloudinary";
import { fieldErrorsFrom } from "@/lib/forms";
import { logger } from "@/lib/logger";
import {
  createShipment,
  deleteShipment,
  updateShipment,
  updateShipmentStatus,
} from "@/services/shipment.service";
import type { ShipmentPhoto } from "@/types/shipment";
import {
  shipmentCreateSchema,
  shipmentPhotoSchema,
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

/**
 * An untouched <input type="file"> still posts an entry: a zero-byte File with an
 * empty name. That is "absent", not "an empty image".
 */
function file(formData: FormData, key: string): File | undefined {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : undefined;
}

function shipmentPayload(formData: FormData) {
  return {
    sender: {
      name: text(formData, "sender.name") ?? "",
      country: text(formData, "sender.country"),
      location: text(formData, "sender.location") ?? "",
      phone: text(formData, "sender.phone"),
    },
    receiver: {
      name: text(formData, "receiver.name") ?? "",
      country: text(formData, "receiver.country"),
      location: text(formData, "receiver.location") ?? "",
      phone: text(formData, "receiver.phone"),
      email: text(formData, "receiver.email"),
    },
    details: {
      transportType: text(formData, "details.transportType"),
      weightKg: text(formData, "details.weightKg"),
      shipDate: text(formData, "details.shipDate"),
      expectedDelivery: text(formData, "details.expectedDelivery"),
    },
  };
}

/**
 * Validates and uploads the optional photo, shared by create and edit.
 *
 * Returns a discriminated result rather than throwing so the caller keeps its
 * straight-line shape, and so the "no photo posted" case stays distinguishable
 * from "the upload failed".
 */
async function resolvePhoto(
  formData: FormData,
  userId: string,
): Promise<{ photo?: ShipmentPhoto } | { error: ShipmentFormState }> {
  const photoFile = file(formData, "photo");
  if (!photoFile) return {};

  // NOT routed through nestedFieldErrors(): this schema's paths are ["type"] and
  // ["size"], which would yield field keys the form does not render, and the
  // message would vanish silently.
  const checked = shipmentPhotoSchema.safeParse({ type: photoFile.type, size: photoFile.size });
  if (!checked.success) {
    return {
      error: {
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: { photo: checked.error.issues[0]?.message ?? "That image cannot be used." },
      },
    };
  }

  try {
    return { photo: await uploadShipmentPhoto(photoFile) };
  } catch (error) {
    logger.error("shipment photo upload failed", { error, userId });
    return {
      error: {
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: { photo: "The image could not be uploaded. Please try again." },
      },
    };
  }
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

  // Deliberately after the text parse: a mistyped weight must not burn an upload.
  const uploaded = await resolvePhoto(formData, session.userId);
  if ("error" in uploaded) return uploaded.error;
  const photo = uploaded.photo;

  let trackingCode: string;
  try {
    const created = await createShipment(parsed.data, session.userId, photo);
    trackingCode = created.trackingCode;
  } catch (error) {
    // The public id is logged so an asset orphaned by this failure is findable.
    // It is not a secret, and the logger's key regex does not match it.
    logger.error("shipment create failed", {
      error,
      userId: session.userId,
      orphanedPublicId: photo?.publicId,
    });
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

  // Only reaches the service when the shipment has no photo yet — the service
  // enforces that, because the absent form field is UI, not a boundary.
  const uploaded = await resolvePhoto(formData, session.userId);
  if ("error" in uploaded) return uploaded.error;

  try {
    const updated = await updateShipment(id, parsed.data, uploaded.photo);
    if (!updated) return { status: "error", message: "That shipment no longer exists." };
  } catch (error) {
    logger.error("shipment update failed", {
      error,
      userId: session.userId,
      orphanedPublicId: uploaded.photo?.publicId,
    });
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
    // Rejected by the schema unless the status is customs_held, rather than
    // dropped: a figure the operator typed must not vanish silently.
    amount: text(formData, "amount"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom<"status" | "note" | "amount">(parsed.error),
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
