import { z } from "zod";

import { PHOTO_MIME_TYPES } from "@/validations/shipment";

/**
 * Shared shapes and limits for the support chat.
 *
 * Zod-only and client-safe, exactly like `@/validations/shipment`: the public
 * widget, the admin reply form, the route handlers and the service all import
 * from here, so nothing in this file may reach a runtime global or a server
 * module.
 */

/* -------------------------------------------------------------------------- */
/* Enumerations                                                                */
/* -------------------------------------------------------------------------- */

// Plain const arrays rather than TS `enum`, matching @/validations/shipment —
// scripts/ runs under bare node, which does not support enum (rule 19).
export const CHAT_AUTHORS = ["visitor", "admin"] as const;
export type ChatAuthor = (typeof CHAT_AUTHORS)[number];

/**
 * There is no "pending" or "archived". A conversation is either taking messages
 * or it is not, and deletion is permanent (rule 25) — the same posture the
 * shipment module takes.
 */
export const CHAT_STATUSES = ["open", "closed"] as const;
export type ChatStatus = (typeof CHAT_STATUSES)[number];

export const DEFAULT_CHAT_STATUS: ChatStatus = "open";

/* -------------------------------------------------------------------------- */
/* Field limits                                                                */
/* -------------------------------------------------------------------------- */

export const VISITOR_NAME_MAX = 80;
export const VISITOR_EMAIL_MAX = 160;

/**
 * Long enough for a paragraph describing a lost consignment, short enough that
 * 200 of them cannot bloat a conversation. The textarea carries the same number
 * as `maxLength`, which is UX — this is the boundary.
 */
export const MESSAGE_MAX_CHARS = 2000;

/** The denormalised inbox preview. One line in a list row, never more. */
export const PREVIEW_MAX_CHARS = 120;

/**
 * What a visitor typed into the tracking-code field when it did NOT resolve.
 * Kept rather than rejected (rule 54), capped at the same 40 characters
 * `forDisplay` uses on the public tracking page — a layout guard, not a filter.
 */
export const TRACKING_CODE_ATTEMPT_MAX = 40;

/* -------------------------------------------------------------------------- */
/* Caps                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Storage caps, every one of them enforced by the FILTER of an atomic update
 * rather than a read-then-write (rule 44) — two browser tabs would race straight
 * past a read-then-write.
 *
 * These bound what one conversation can store. They are not a rate limiter and
 * they do not pretend to be: see CLAUDE.md gap 23.
 */
export const MESSAGES_PER_CONVERSATION_MAX = 200;
export const IMAGES_PER_CONVERSATION_MAX = 10;

/**
 * Counted off the `sendly_visitor` cookie, so clearing cookies resets it. It
 * exists to stop an accidental loop or an over-enthusiastic visitor, never an
 * attacker (gap 24).
 */
export const CONVERSATIONS_PER_VISITOR_MAX = 3;

/* -------------------------------------------------------------------------- */
/* Image attachment                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Deliberately smaller than `PHOTO_MAX_BYTES`. A consignment photo is evidence
 * of what was consigned, uploaded once by an operator at a desk; a chat
 * attachment is a phone screenshot rendered in a 320px-wide bubble, sent by
 * someone who is probably on mobile data.
 *
 * NOT coupled to `experimental.serverActions.bodySizeLimit` on the visitor path:
 * that setting governs Server Actions only, and the visitor's send is a Route
 * Handler, so there is no platform 413 to lean on below Vercel's ~4.5 MB ceiling
 * (rule 49). The handler checks `content-length` itself. The ADMIN reply IS a
 * Server Action and rides the existing 4.25 MB limit, so next.config.ts needs no
 * change — which stops being true the moment this exceeds ~4 MB.
 */
export const CHAT_IMAGE_MAX_BYTES = 1_500_000;

/**
 * Slack for the multipart boundaries, headers and the text field that travel
 * alongside the image, so the handler's `content-length` pre-check rejects only
 * what is genuinely oversize.
 */
export const REQUEST_OVERHEAD_BYTES = 64 * 1024;

/**
 * Reused verbatim from the shipment module rather than restated. The set of
 * formats Cloudinary and every browser agree on does not vary by subject, and a
 * second list would drift out of step with the first.
 */
export const CHAT_IMAGE_MIME_TYPES = PHOTO_MIME_TYPES;

/** The file input's `accept` attribute, so the picker and the server agree. */
export const CHAT_IMAGE_ACCEPT = CHAT_IMAGE_MIME_TYPES.join(",");

/**
 * Validates the *metadata* of an attachment, not a `File` instance — the same
 * choice `shipmentPhotoSchema` makes, and for the same reason: this module is
 * imported by client components, so `z.instanceof(File)` would couple it to a
 * runtime global and make these cases untestable without constructing a File.
 */
export const chatImageSchema = z.object({
  type: z.enum(CHAT_IMAGE_MIME_TYPES, { message: "Attach a PNG, JPEG, WebP or AVIF image" }),
  size: z
    .number()
    .int()
    .positive("That file is empty")
    .max(CHAT_IMAGE_MAX_BYTES, "That image is larger than 1.5 MB"),
});

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The capability cookie. Holding it authorizes reading and writing exactly one
 * conversation, so it is set `httpOnly` and never appears in any DTO (rule 43).
 */
export const CHAT_COOKIE = "sendly_chat";

/**
 * A longer-lived browser id whose only job is the per-visitor conversation cap.
 * It authorizes nothing. See gap 25 — this is the most tracking-like thing in
 * the application, and it is why both cookies are capped at 30 days.
 */
export const VISITOR_COOKIE = "sendly_visitor";

export const CHAT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Shapes, not credentials. Rejecting a malformed token costs a regex and happens
 * BEFORE `connectToDatabase()`, which is the only read-side defence these
 * endpoints have — the same trick `getShipmentByTrackingCode` relies on (gap 23).
 *
 * 43 characters is what `randomBytes(32).toString("base64url")` produces; 22 is
 * `randomBytes(16)`. Base64url emits no padding, so neither has a trailing `=`.
 */
export const VISITOR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/** One page of a cursor poll. Bounds a response that is otherwise unbounded. */
export const CHAT_POLL_PAGE_SIZE = 50;

/** How long a presence timestamp is treated as "now", and how often it is written. */
export const CHAT_PRESENCE_THROTTLE_MS = 30_000;
export const CHAT_PRESENCE_WINDOW_MS = 45_000;

/* -------------------------------------------------------------------------- */
/* Field helpers                                                               */
/* -------------------------------------------------------------------------- */

// `.optional()` must be OUTERMOST (rule 22). Applied before `.transform()` it
// yields a required KEY whose value may be undefined, forcing every caller to
// write `body: undefined`.
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value ? value : undefined))
    .optional();

/* -------------------------------------------------------------------------- */
/* Operations                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The pre-chat form. Name is the only required field: an inbox of anonymous
 * threads is unusable, but asking for more than a name before someone can
 * describe their problem is friction that loses the support request.
 *
 * `trackingCode` is NEVER rejected here (rule 54). It is normalised and capped,
 * and the service decides whether it resolves to a shipment — a valid code links
 * the conversation, anything else is kept verbatim so the admin can see what the
 * visitor meant. Failing the form on a mistyped code would block the request
 * that was the entire point.
 */
export const chatStartSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tell us your name")
    .max(VISITOR_NAME_MAX, "That name is too long"),
  // Mirrors receiverSchema.email: blank means absent, so an untouched optional
  // field is not persisted as an empty string or reported as an invalid address.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(VISITOR_EMAIL_MAX, "That email address is too long")
    .transform((value) => (value ? value : undefined))
    .pipe(z.email("Enter a valid email address").optional())
    .optional(),
  trackingCode: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value.replace(/\s+/g, "").slice(0, TRACKING_CODE_ATTEMPT_MAX))
    .transform((value) => (value ? value : undefined))
    .optional(),
});

export type ChatStartValues = z.output<typeof chatStartSchema>;

/**
 * One outbound message, from either side.
 *
 * `body` is optional because an image-only message is legal — but only once the
 * visitor has sent at least one text message, which is a cap the service
 * enforces, and "exactly one of body or image" is checked there too, because
 * this schema cannot see the attachment.
 */
export const chatSendSchema = z.object({
  body: optionalText(MESSAGE_MAX_CHARS, "That message is too long"),
});

export type ChatSendValues = z.output<typeof chatSendSchema>;

/** The cursor a poll sends. Clamped rather than rejected: it comes from a URL. */
export const chatCursorSchema = z.coerce.number().int().min(0).max(1_000_000).catch(0);

/* -------------------------------------------------------------------------- */
/* Listing                                                                     */
/* -------------------------------------------------------------------------- */

export const CHAT_INBOX_PAGE_SIZE = 20;

/**
 * Parsed from URL search params, which are attacker-controlled: every field
 * falls back to a safe default rather than throwing, so a hand-edited query
 * string renders page 1 instead of an error page. Mirrors
 * `shipmentListQuerySchema`.
 */
export const chatListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  status: z.enum(CHAT_STATUSES).optional().catch(undefined),
  /**
   * Only threads the admin has not answered. Drives the bell's "needs a reply".
   *
   * Deliberately not `z.coerce.boolean()`: `Boolean("0")` and `Boolean("false")`
   * are both true, so `?unread=0` would switch the filter ON. An allow-list of
   * affirmative spellings cannot do that, and anything else falls to undefined.
   */
  unread: z
    .enum(["1", "true"])
    .optional()
    .transform((value) => (value === undefined ? undefined : true))
    .catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
});

export type ChatListQuery = z.output<typeof chatListQuerySchema>;
