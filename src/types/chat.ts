import type { CountryCode } from "@/lib/countries";
import type { ChatAuthor, ChatStatus } from "@/validations/chat";

/**
 * The plain, serializable shapes the chat service returns to the ADMIN.
 *
 * They live here rather than in the service because components render them, and
 * `@/services/*` is a restricted import for client-side code (eslint.config.mjs).
 * Every date is an ISO 8601 string, not a `Date`, so these cross the
 * server/client boundary unchanged.
 *
 * What the PUBLIC widget renders is `@/types/chat-visitor`, a separate module
 * for the reason rule 34 gives — and with higher stakes, because one of the
 * fields that must not cross is a live credential.
 *
 * Absent from EVERY shape in this file:
 *   - `visitorToken`  the capability. An admin page's props land in the RSC
 *                     payload the browser can read, so a token here would let
 *                     anyone holding that HTML impersonate the visitor.
 *   - `visitorId`     a cross-conversation browser identifier; it answers no
 *                     support question
 *   - `authorId`      which admin user sent a reply. There is one admin.
 *   - `image.publicId` a path inside our Cloudinary account
 */

/**
 * An attachment, ready to render.
 *
 * `url` already carries the delivery transformation the service bakes in, and
 * `publicId` is deliberately absent — the widget and the admin thread both use a
 * plain `<img>`, so nothing needs it (rule 51). Shared with the visitor DTO so
 * the two cannot drift, which is safe precisely because the shape holds nothing
 * the visitor may not see.
 *
 * NOTE `width`/`height` describe the ORIGINAL upload, not the delivered image,
 * so they may be used for aspect ratio and never as pixel dimensions.
 */
export type ChatImage = {
  url: string;
  width: number;
  height: number;
};

/**
 * What gets STORED for an attachment — the DTO above plus `publicId`.
 *
 * Mirrors `ShipmentPhoto`, and is what the Route Handler and the admin reply
 * action hand the service after a Cloudinary upload — the service never sees a
 * `File` and never talks to Cloudinary itself.
 *
 * Note the type system does NOT stop this leaking: a `ChatImageRecord` is
 * structurally assignable to `ChatImage`, because excess-property checking only
 * applies to fresh object literals. So returning one straight from a mapper
 * compiles and ships `publicId` in the JSON. The guarantee is the mapper listing
 * its fields explicitly (rule 34's "never spread"), and a test asserting no
 * `publicId` survives the boundary.
 */
export type ChatImageRecord = ChatImage & {
  publicId: string;
};

/**
 * Where the conversation started, snapshotted from the `x-vercel-*` headers at
 * create time and never refreshed — where someone began is a fact, a field that
 * silently changes mid-thread is not.
 *
 * Every field is optional because NONE of those headers exist under `next dev`.
 * The admin card renders "Not recorded" rather than guessing (rule 53).
 *
 * There is no `ip` field, deliberately: it is the one value that identifies a
 * person beyond what they typed, and no support answer needs it.
 */
export type VisitorMeta = {
  country?: CountryCode;
  region?: string;
  city?: string;
  timezone?: string;
  userAgent?: string;
  referer?: string;
};

export type ChatMessage = {
  id: string;
  /** The cursor. Per-conversation, gap-free, strictly increasing (rule 41). */
  seq: number;
  author: ChatAuthor;
  /** Absent on an image-only message. */
  body?: string;
  image?: ChatImage;
  sentAt: string;
};

export type ConversationSummary = {
  id: string;
  visitorName: string;
  status: ChatStatus;
  /** Only when the visitor's code resolved to a shipment. */
  trackingCode?: string;
  countryCode?: CountryCode;
  lastMessageAt: string;
  /** Absent until the first message — a conversation can exist with none. */
  lastMessageFrom?: ChatAuthor;
  lastMessagePreview?: string;
  /** Messages from the visitor since the admin last replied or opened the thread. */
  unread: number;
  messageCount: number;
};

export type ConversationDetail = ConversationSummary & {
  visitorEmail?: string;
  /** The linked consignment, for a link to `/admin/cargo/<id>`. */
  shipmentId?: string;
  /** What the visitor typed when it did NOT resolve, so the admin can see it. */
  trackingCodeAttempted?: string;
  meta?: VisitorMeta;
  startedAt: string;
  /** The highest allocated `seq`, so a live thread knows where to poll from. */
  lastSeq: number;
  visitorLastSeenAt?: string;
  closedAt?: string;
};

export type ConversationPage = {
  items: ConversationSummary[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

/**
 * One admin poll response. `messages` and the fields beside it are absent when
 * no `conversationId` was asked for — the topbar bell needs only the count, so
 * it must not pay for a thread read.
 */
export type AdminPoll = {
  unread: number;
  status?: ChatStatus;
  messages?: ChatMessage[];
  cursor?: number;
  hasMore?: boolean;
};
