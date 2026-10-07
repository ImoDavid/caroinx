/**
 * How anything on the public site asks the chat widget to open.
 *
 * A DOM `CustomEvent` rather than React context or a store. The alternative
 * would be wrapping `(public)/layout.tsx` in a client provider so a CTA buried
 * in a Server Component tree could reach the launcher's state — that pushes a
 * client boundary up over the whole public site to move one boolean, and this
 * project does not add state management for a problem this size.
 *
 * The event name and the payload live here so there is exactly one spelling of
 * both. `chat-launcher.tsx` is the only listener.
 *
 * Client-safe but NOT marked `"use client"`: it is a plain module, and only
 * `openChat()` touches `window` — so a Server Component may import the name
 * without dragging anything into its bundle.
 */

export const OPEN_CHAT_EVENT = "sendly:open-chat";

export type OpenChatDetail = {
  /**
   * Prefills the pre-chat form's tracking-code field.
   *
   * The point of that field is that a resolved code puts the consignment beside
   * the thread for the admin (rule 41). When the CTA is ON a tracking result we
   * already know the code, so asking the visitor to retype it off the screen
   * they are looking at is pure friction.
   */
  trackingCode?: string;
};

export function openChat(detail: OpenChatDetail = {}): void {
  window.dispatchEvent(new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail }));
}
