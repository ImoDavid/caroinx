"use client";

import { useEffect, useRef } from "react";

import type { VisitorMessage } from "@/types/chat-visitor";

import { ChatBubble, PendingBubble, type PendingMessage } from "./chat-bubble";

/**
 * Client because it owns scroll position and an announcement region — both
 * browser state. Part of `chat-launcher`'s island.
 */

/** Close enough to the bottom that a new message should pull the view down. */
const STICK_THRESHOLD_PX = 80;

export type ChatThreadProps = {
  messages: VisitorMessage[];
  pending: PendingMessage[];
  agentPresent: boolean;
  onRetry: (tempId: number) => void;
};

export function ChatThread({ messages, pending, agentPresent, onRetry }: ChatThreadProps) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const stuck = useRef(true);

  const count = messages.length + pending.length;

  useEffect(() => {
    const element = scroller.current;
    // Only follow the conversation if the visitor was already at the bottom.
    // Yanking the view away from someone reading history is worse than making
    // them scroll down for a reply they can already see has arrived.
    if (element && stuck.current) element.scrollTop = element.scrollHeight;
  }, [count]);

  // The newest INBOUND message only. A live region wrapped around the list
  // would re-announce the whole history on mount and again on every append, so
  // the visible list carries `role="log"` for structure and no live region, and
  // this hidden paragraph does the announcing.
  const newestInbound = [...messages].reverse().find((message) => message.author === "admin");

  return (
    <>
      <div
        ref={scroller}
        onScroll={(event) => {
          const element = event.currentTarget;
          stuck.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < STICK_THRESHOLD_PX;
        }}
        // min-h-0 is REQUIRED: a flex child defaults to `min-height: auto`, so
        // without it `overflow-y-auto` never engages and the panel grows past
        // its container instead of scrolling inside it.
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-space-md py-space-sm"
      >
        {count === 0 ? (
          <p className="py-space-lg text-center text-body-sm text-text-muted">
            {agentPresent
              ? "Someone is here. Ask us anything about your shipment."
              : "Send us a message and we will reply here."}
          </p>
        ) : null}

        <ul role="log" className="flex flex-col gap-space-sm">
          {messages.map((message) => (
            <ChatBubble key={message.seq} message={message} />
          ))}
          {pending.map((message) => (
            <PendingBubble key={message.tempId} message={message} onRetry={onRetry} />
          ))}
        </ul>
      </div>

      <p aria-live="polite" className="sr-only">
        {newestInbound ? `Support: ${newestInbound.body ?? "sent an image"}` : ""}
      </p>
    </>
  );
}
