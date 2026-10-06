"use client";

import { Headset, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { VisitorConversation } from "@/types/chat-visitor";

/**
 * The panel frame: header, body slot, and nothing else. Client because it is
 * part of `chat-launcher`'s island and takes an `onClose` handler.
 */

export type ChatPanelProps = {
  panelId: string;
  titleId: string;
  conversation: VisitorConversation | null;
  onClose: () => void;
  children: ReactNode;
};

export function ChatPanel({ panelId, titleId, conversation, onClose, children }: ChatPanelProps) {
  return (
    <div
      id={panelId}
      role="dialog"
      aria-labelledby={titleId}
      data-print="hide"
      // Mobile-first, read literally: the UNPREFIXED classes are a full-bleed
      // sheet, and `sm:` ADDS the anchored card. Not a fixed 400px box.
      //
      // `dvh` not `vh` — mobile browser chrome changes `vh`, which would leave
      // the composer under the URL bar.
      //
      // z-[55]: above the fixed z-50 header (on a phone this covers the page, so
      // the header painting over it would be a bug) but below the skip link's
      // focus:z-[60], which must stay reachable. An arbitrary value on purpose —
      // relying on DOM order to beat z-50 breaks the moment anything between
      // gets `position: relative`.
      className={cn(
        "fixed inset-x-2 top-2 bottom-2 z-[55] flex flex-col overflow-hidden rounded-2xl bg-surface-white shadow-2xl ring-1 ring-border-subtle",
        // Same correction as the launcher: fixed is laid out against the LARGE
        // viewport, so without this the composer at the bottom of the panel
        // sits under the mobile browser's toolbar and cannot be tapped.
        // `100lvh - 100dvh` is the height of whatever chrome is showing.
        "max-sm:bottom-[calc(100lvh-100dvh+0.5rem)]",
        "sm:inset-auto sm:right-3 sm:bottom-3 sm:h-[min(32rem,calc(100dvh-6rem))] sm:w-[min(23rem,calc(100vw-1.5rem))]",
      )}
    >
      <header className="flex items-start gap-space-sm bg-primary-container px-space-md py-space-sm">
        <Headset className="mt-0.5 size-5 shrink-0 text-secondary-container" aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-title-sm font-bold text-white">
            Support
          </h2>
          <p className="truncate text-label-sm text-white/70">
            {conversation?.trackingCode
              ? conversation.trackingCode
              : conversation?.agentPresent
                ? "Someone is with you"
                : "We reply as soon as we can"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-secondary-container focus-visible:outline-none"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>

      {children}
    </div>
  );
}
