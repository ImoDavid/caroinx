"use client";

import { cn } from "@/lib/utils";

import { openChat } from "./open-chat";

/**
 * The button half of `ChatCta`. Client because it dispatches the open event.
 *
 * Kept separate from the server wrapper so the `<noscript>` fallback beside it
 * is emitted by a Server Component — React's CLIENT renderer serialises no
 * children into `<noscript>` at all (rule 57), so a fallback authored inside a
 * client component is reliable only during SSR and is a trap waiting to be
 * "tidied" into one.
 */
export function ChatCtaButton({
  children,
  trackingCode,
  className,
}: {
  children: React.ReactNode;
  trackingCode?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-print="hide"
      onClick={() => {
        openChat({ trackingCode });
      }}
      className={cn(
        "rounded font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </button>
  );
}
