"use client";

import { useCallback, useRef, useState } from "react";

import { ChatMessageList } from "@/components/admin/chat-message-list";
import { useAdminChatPoll } from "@/components/admin/use-admin-chat-poll";
import type { AdminPoll, ChatMessage } from "@/types/chat";

/**
 * The admin thread, kept live by a poll.
 *
 * Seeded from props ONCE and never reconciled against them again. That looks
 * like a bug, so: the reply action calls `revalidatePath` on this page so the
 * NO-JAVASCRIPT path shows the message it just sent. With JavaScript on, the
 * list is owned here — the poll confirms every message, including the admin's
 * own reply — and reconciling against new props would either double-render a
 * message or drop one. React keeps this state across the server re-render
 * because the component's position and key are stable, so the cost is one wasted
 * server render per reply, which is the price of the no-JS path working at all.
 *
 * Reuses `ChatMessageList`, which is `"use client"` precisely so the same
 * implementation serves both this and the server-rendered thread (rule 61).
 */

export type ChatThreadLiveProps = {
  conversationId: string;
  initialMessages: ChatMessage[];
  initialCursor: number;
};

function merge(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return current;

  const seen = new Set(current.map((message) => message.seq));
  const added = incoming.filter((message) => !seen.has(message.seq));
  if (added.length === 0) return current;

  return [...current, ...added].sort((a, b) => a.seq - b.seq);
}

export function ChatThreadLive({
  conversationId,
  initialMessages,
  initialCursor,
}: ChatThreadLiveProps) {
  // `useState` initialisers run once. Later prop changes are ignored by design.
  const [messages, setMessages] = useState(initialMessages);
  const [gone, setGone] = useState(false);
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());

  const cursor = useRef(initialCursor);

  const onPoll = useCallback((poll: AdminPoll) => {
    if (!poll.messages) return;
    setMessages((current) => {
      const next = merge(current, poll.messages ?? []);
      if (next !== current) setLastActivityAt(Date.now());
      return next;
    });
  }, []);

  const onGone = useCallback(() => {
    setGone(true);
  }, []);

  useAdminChatPoll({
    conversationId,
    // The admin is looking at this thread, so it polls at the active rate while
    // the conversation is recent and backs off when it goes quiet.
    focused: true,
    lastActivityAt,
    cursorRef: cursor,
    onPoll,
    onGone,
  });

  return (
    <>
      <ChatMessageList messages={messages} />
      {gone ? (
        <p role="status" className="pt-space-sm text-body-sm text-destructive">
          This conversation has been deleted.
        </p>
      ) : null}
    </>
  );
}
