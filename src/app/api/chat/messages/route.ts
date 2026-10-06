import type { NextRequest } from "next/server";

import { uploadChatImage } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import {
  appendVisitorMessage,
  pollVisitorMessages,
  reserveVisitorImageSlot,
  touchVisitorPresence,
  type AppendRefusal,
} from "@/services/chat.service";
import type { ChatImageRecord } from "@/types/chat";
import {
  CHAT_COOKIE,
  CHAT_IMAGE_MAX_BYTES,
  REQUEST_OVERHEAD_BYTES,
  chatCursorSchema,
  chatImageSchema,
} from "@/validations/chat";

import { chatError, chatJson, chatNoContent } from "../_respond";

/**
 * The visitor's half of the chat transport: one cursor poll and one send.
 *
 * HTTP rather than Server Actions, against the bar set in
 * `api/auth/[...all]/route.ts`. The poll needs `?after=`, an `AbortController`,
 * `Cache-Control: no-store` and a body that is literally `{ messages: [] }`,
 * none of which a Server Action can give: it is POST-only, cannot be aborted,
 * cannot set cache headers, and answers with an RSC flight payload coupled to
 * the calling page's router state — which on the statically prerendered `/`
 * means a router revalidation per message.
 *
 * No `export const dynamic`: Route Handlers are not cached in this version of
 * Next and both methods read a cookie, so it would be dead configuration.
 */

/** Maps a service refusal to a status the widget can act on. */
function refusalResponse(refusal: AppendRefusal | "invalid"): Response {
  switch (refusal) {
    case "unknown":
      // The cookie is stale or forged. 401 tells the widget to drop its state
      // and show the pre-chat form rather than retrying forever.
      return chatError("Start a new conversation to keep talking to us.", 401);
    case "closed":
      return chatError("This conversation has been closed.", 409);
    case "text-first":
      return chatError("Send us a message before attaching an image.", 409);
    case "message-cap":
      return chatError("This conversation has reached its message limit.", 429);
    case "image-cap":
      return chatError("This conversation has reached its attachment limit.", 429);
    case "invalid":
      return chatError("Type a message or attach an image.", 422);
  }
}

function tokenFrom(request: NextRequest): string | undefined {
  return request.cookies.get(CHAT_COOKIE)?.value;
}

/**
 * One page of messages after a cursor.
 *
 * 204 when there is no conversation — an absent cookie, a stale one, or a forged
 * one. That is also why there is no separate "what is my session" endpoint: this
 * call with `after=0` already answers it.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const token = tokenFrom(request);
  if (!token) return chatNoContent();

  const params = request.nextUrl.searchParams;
  const after = chatCursorSchema.parse(params.get("after") ?? 0);
  // The client says whether the panel is actually open. A closed panel polls
  // too, so that it can raise an unread dot — clearing the dot on that poll
  // would mean it never showed. A lying client only clears its own badge.
  const panelOpen = params.get("open") === "1";

  try {
    const [poll] = await Promise.all([
      pollVisitorMessages(token, after, panelOpen),
      touchVisitorPresence(token),
    ]);

    return poll ? chatJson(poll) : chatNoContent();
  } catch (error) {
    logger.error("chat poll failed", { error });
    return chatError("Something went wrong. Please try again.", 500);
  }
}

/**
 * Sends one visitor message, with an optional image.
 *
 * `multipart/form-data`, so one request carries both — and the image path is
 * reserve, upload, append, in that order, so a visitor already at the cap cannot
 * burn upload quota.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const token = tokenFrom(request);
  if (!token) return refusalResponse("unknown");

  // `experimental.serverActions.bodySizeLimit` governs Server Actions ONLY, so
  // there is no platform 413 to lean on below Vercel's ~4.5 MB ceiling (rule 42).
  // Checked before `formData()` so an oversize body is never buffered. The
  // header is attacker-controlled, which is why the real `file.size` is still
  // validated below — this is the cheap early exit, not the authority.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > CHAT_IMAGE_MAX_BYTES + REQUEST_OVERHEAD_BYTES) {
    return chatError("That image is larger than 1.5 MB.", 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return chatError("Type a message or attach an image.", 400);
  }

  const bodyField = form.get("body");
  const body = typeof bodyField === "string" ? bodyField : undefined;

  const fileField = form.get("image");
  // An untouched file input posts a zero-byte, empty-name File, exactly as in
  // cargo/actions.ts — that is "no attachment", not an empty one.
  const file = fileField instanceof File && fileField.size > 0 ? fileField : undefined;

  try {
    let image: ChatImageRecord | undefined;

    if (file) {
      const checked = chatImageSchema.safeParse({ type: file.type, size: file.size });
      if (!checked.success) {
        return chatError(checked.error.issues[0]?.message ?? "That attachment was rejected.", 422);
      }

      const slot = await reserveVisitorImageSlot(token);
      if (slot !== "ok") return refusalResponse(slot);

      try {
        const uploaded = await uploadChatImage(file);
        image = {
          url: uploaded.url,
          publicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
        };
      } catch (error) {
        // The slot is spent and the asset may or may not exist. Logged so the
        // cost is visible rather than mysterious — the deliberate fail-closed
        // trade for reserving before uploading (rule 48).
        logger.error("chat image upload failed after reserving a slot", {
          error,
          chatImageSlotBurned: true,
        });
        return chatError("That image could not be uploaded. Please try again.", 502);
      }
    }

    const result = await appendVisitorMessage(token, { body }, image);
    if (typeof result === "string") return refusalResponse(result);

    return chatJson(result, 201);
  } catch (error) {
    logger.error("failed to append a chat message", { error });
    return chatError("Something went wrong. Please try again.", 500);
  }
}
