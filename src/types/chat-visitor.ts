import type { ChatImage } from "@/types/chat";
import type { ChatAuthor, ChatStatus } from "@/validations/chat";

/**
 * What the PUBLIC chat widget renders.
 *
 * A separate module from `@/types/chat` for the reason rule 34 gives — but the
 * stakes are higher here than for tracking. This shape is serialised by a Route
 * Handler every few seconds, and one of the fields it must not carry is a LIVE
 * CREDENTIAL. Keeping the two side by side in one file would invite handing the
 * admin shape to a public component by accident.
 *
 * Absent on purpose:
 *   - `visitorToken`            the capability. Leaking it hands over the thread.
 *   - `visitorId`               a cross-conversation browser identifier
 *   - `id`                      the Mongo ObjectId; an internal handle
 *   - `authorId` / `closedBy`   admin user ids
 *   - `meta`                    the visitor's own geo. Echoing it back buys
 *                               nothing and reads as surveillance.
 *   - `unreadForAdmin`,
 *     `adminLastSeenAt`         operational state. `agentPresent` is the derived
 *                               boolean; the raw timestamp never crosses.
 *   - `shipmentId`,
 *     `trackingCodeAttempted`   internal handles. Only a code that RESOLVED, and
 *                               only the one the visitor typed themselves,
 *                               comes back.
 *   - `image.publicId`          a path inside our Cloudinary account
 *   - every other conversation. There is no endpoint that can return two.
 */
export type VisitorMessage = {
  /** The cursor. Negative values are the client's own optimistic entries. */
  seq: number;
  author: ChatAuthor;
  body?: string;
  image?: ChatImage;
  sentAt: string;
};

export type VisitorConversation = {
  /** Echoed back so the panel can greet a returning visitor after a reload. */
  name: string;
  status: ChatStatus;
  /** Only when the code resolved — and it is the visitor's own code. */
  trackingCode?: string;
  startedAt: string;
  lastSeq: number;
  /** Admin replies the visitor has not seen. Drives the launcher's dot. */
  unread: number;
  /**
   * Whether anyone has looked at this thread recently. Derived from a presence
   * timestamp, never the timestamp itself.
   *
   * There is no global "an admin is online" — presence is recorded per
   * conversation, because there is exactly one admin and nowhere to put
   * per-admin state. So this is false until someone opens the thread, and the
   * pre-chat form shows honest static copy instead of a green dot.
   */
  agentPresent: boolean;
};

export type VisitorPoll = {
  conversation: VisitorConversation;
  /** `seq` greater than the cursor asked for, ascending, at most one page. */
  messages: VisitorMessage[];
  cursor: number;
  /** The page was capped, so poll again immediately rather than waiting. */
  hasMore: boolean;
};
