"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/guards";
import { uploadChatImage } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import {
  appendAdminMessage,
  closeConversation,
  deleteConversation,
  reopenConversation,
} from "@/services/chat.service";
import type { ChatImageRecord } from "@/types/chat";
import { chatImageSchema } from "@/validations/chat";

import type {
  ConversationFormState,
  DeleteConversationFormState,
  ReplyFormState,
} from "./form-state";

/**
 * Every action here re-verifies with `requireAdmin()`.
 *
 * A Server Action is a public POST endpoint: rendering its form on an
 * authenticated page is not a security boundary, so the check cannot be
 * inherited from the page that rendered the form.
 *
 * These are Server Actions rather than Route Handlers because they are the
 * inverse case to the chat poll (rule 52): they post a file from a real
 * `<form>`, so they want `encType="multipart/form-data"` (rule 28), the
 * existing `bodySizeLimit`, `revalidatePath`, and a working no-JavaScript path.
 * The admin reply is the one part of this feature that degrades gracefully.
 */

const UNEXPECTED = "Something went wrong. Please try again.";

/** FormData gives "" for an untouched input; the schemas treat "" as absent. */
function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

/**
 * An untouched <input type="file"> still posts an entry: a zero-byte File with
 * an empty name. That is "absent", not "an empty image".
 */
function file(formData: FormData, key: string): File | undefined {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : undefined;
}

/**
 * Uploads an attachment if there is one.
 *
 * Returns a discriminated result rather than throwing, the same shape
 * `resolvePhoto` uses in the cargo actions, so the caller reads
 * `if ("error" in result)` instead of wrapping a try/catch around its own flow.
 *
 * Unlike the visitor path there is no slot to reserve: the admin is trusted and
 * has no cap, so a failed upload costs nothing but the attempt.
 */
async function resolveImage(
  formData: FormData,
  actorId: string,
): Promise<{ image?: ChatImageRecord } | { error: ReplyFormState }> {
  const picked = file(formData, "image");
  if (!picked) return {};

  const checked = chatImageSchema.safeParse({ type: picked.type, size: picked.size });
  if (!checked.success) {
    // Bypasses `fieldErrorsFrom` deliberately: this schema's issue paths are
    // ["type"] and ["size"], which map to no rendered field. The one field that
    // exists is "image".
    return {
      error: {
        status: "error",
        message: "Check the attachment.",
        fieldErrors: { image: checked.error.issues[0]?.message ?? "That attachment was rejected." },
      },
    };
  }

  try {
    const uploaded = await uploadChatImage(picked);
    return {
      image: {
        url: uploaded.url,
        publicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
      },
    };
  } catch (error) {
    logger.error("admin chat image upload failed", { error, actorId });
    return {
      error: {
        status: "error",
        message: "That image could not be uploaded. Please try again.",
        fieldErrors: { image: "Upload failed." },
      },
    };
  }
}

export async function sendAdminReplyAction(
  _previous: ReplyFormState,
  formData: FormData,
): Promise<ReplyFormState> {
  const session = await requireAdmin();

  const id = text(formData, "id");
  if (!id) return { status: "error", message: UNEXPECTED };

  const body = text(formData, "body");

  try {
    // After the text is in hand, so a malformed request never burns an upload —
    // the same ordering the cargo create action uses.
    const uploaded = await resolveImage(formData, session.userId);
    if ("error" in uploaded) return uploaded.error;

    if (!body?.trim() && !uploaded.image) {
      return {
        status: "error",
        message: "Type a reply or attach an image.",
        fieldErrors: { body: "A reply cannot be empty." },
      };
    }

    const sent = await appendAdminMessage(id, { body }, session.userId, uploaded.image);
    if (!sent) {
      if (uploaded.image) {
        // The asset has no referrer now. Logged so it is findable (gap 29).
        logger.error("chat reply failed after upload", {
          actorId: session.userId,
          orphanedPublicId: uploaded.image.publicId,
        });
      }
      return { status: "error", message: "That conversation no longer exists." };
    }
  } catch (error) {
    logger.error("failed to send a chat reply", { error, actorId: session.userId });
    return { status: "error", message: UNEXPECTED };
  }

  // Both: the thread shows the new message and the list's preview and unread
  // count move. Outside the try/catch so NEXT_REDIRECT is never swallowed —
  // though this path only revalidates, staying on the page and resetting the
  // form, which is the status-form pattern rather than the create one.
  revalidatePath("/admin/inbox");
  revalidatePath(`/admin/inbox/${id}`);
  return undefined;
}

export async function closeConversationAction(
  _previous: ConversationFormState,
  formData: FormData,
): Promise<ConversationFormState> {
  const session = await requireAdmin();

  const id = text(formData, "id");
  if (!id) return { status: "error", message: UNEXPECTED };

  try {
    const closed = await closeConversation(id, session.userId);
    if (!closed) {
      return { status: "error", message: "That conversation is already closed." };
    }
  } catch (error) {
    logger.error("failed to close a conversation", { error, actorId: session.userId });
    return { status: "error", message: UNEXPECTED };
  }

  revalidatePath("/admin/inbox");
  revalidatePath(`/admin/inbox/${id}`);
  return undefined;
}

export async function reopenConversationAction(
  _previous: ConversationFormState,
  formData: FormData,
): Promise<ConversationFormState> {
  const session = await requireAdmin();

  const id = text(formData, "id");
  if (!id) return { status: "error", message: UNEXPECTED };

  try {
    const reopened = await reopenConversation(id);
    if (!reopened) {
      return { status: "error", message: "That conversation is already open." };
    }
  } catch (error) {
    logger.error("failed to reopen a conversation", { error, actorId: session.userId });
    return { status: "error", message: UNEXPECTED };
  }

  revalidatePath("/admin/inbox");
  revalidatePath(`/admin/inbox/${id}`);
  return undefined;
}

export async function deleteConversationAction(
  _previous: DeleteConversationFormState,
  formData: FormData,
): Promise<DeleteConversationFormState> {
  const session = await requireAdmin();

  const id = text(formData, "id");
  if (!id) return { status: "error", message: UNEXPECTED };

  try {
    const deleted = await deleteConversation(id);
    if (!deleted) {
      return { status: "error", message: "That conversation no longer exists." };
    }
  } catch (error) {
    logger.error("failed to delete a conversation", { error, actorId: session.userId });
    return { status: "error", message: UNEXPECTED };
  }

  // Outside the try/catch so NEXT_REDIRECT is not swallowed as an error.
  revalidatePath("/admin/inbox");
  redirect("/admin/inbox?deleted=1");
}
