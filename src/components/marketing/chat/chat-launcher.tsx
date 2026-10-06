"use client";

import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { VisitorConversation, VisitorMessage, VisitorPoll } from "@/types/chat-visitor";

import { startChat, sendChatMessage, type StartInput } from "./chat-api";
import type { PendingMessage } from "./chat-bubble";
import { ChatComposer } from "./chat-composer";
import { ChatPanel } from "./chat-panel";
import { ChatPrechatForm } from "./chat-prechat-form";
import { ChatThread } from "./chat-thread";
import { useChatPoll } from "./use-chat-poll";

/**
 * The chat island's root. The one place in the public site that holds live state.
 *
 * `"use client"` is unavoidable here in a way it is not for
 * `tracking/print-button.tsx`: that button loses only itself when scripting is
 * off, because the browser's own File ▸ Print replaces it. A chat transport has
 * no server-rendered equivalent at all — there is no no-JavaScript chat and
 * there cannot be a cheap one, which is why `chat-mount.tsx` carries a
 * `<noscript>` mailto fallback and why this is recorded as a known gap.
 *
 * It reads NOTHING during render. The widget discovers whether it has a
 * conversation over HTTP, because one `cookies()` call anywhere in the
 * `(public)` tree would turn `/`, `/about` and `/contact` from static into
 * dynamic (rule 54).
 */

/** Newest first in the array we reverse, so this only has to be unique. */
let nextTempId = 1;

/**
 * Confirmed messages only, keyed and ordered by `seq`. Dedupes because React 19
 * StrictMode double-invokes effects in development, and because a retried poll
 * can legitimately overlap a window the send response already merged.
 */
function merge(current: VisitorMessage[], incoming: VisitorMessage[]): VisitorMessage[] {
  if (incoming.length === 0) return current;

  const seen = new Set(current.map((message) => message.seq));
  const added = incoming.filter((message) => !seen.has(message.seq));
  if (added.length === 0) return current;

  return [...current, ...added].sort((a, b) => a.seq - b.seq);
}

export function ChatLauncher() {
  const panelId = useId();
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<VisitorConversation | null>(null);
  const [messages, setMessages] = useState<VisitorMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [lastActivityAt, setLastActivityAt] = useState(0);

  // A ref, not state: a stale closure must never be able to re-request a window
  // that has already been merged.
  const cursor = useRef(0);
  const launcher = useRef<HTMLButtonElement | null>(null);

  const onPoll = useCallback((poll: VisitorPoll) => {
    setConversation(poll.conversation);
    setMessages((current) => {
      const next = merge(current, poll.messages);
      if (next !== current) setLastActivityAt(Date.now());
      return next;
    });
  }, []);

  /** 204/401/404: the cookie is gone or no longer ours. Back to the form. */
  const onGone = useCallback(() => {
    setConversation(null);
    setMessages([]);
    setPending([]);
    cursor.current = 0;
  }, []);

  useChatPoll({
    enabled: conversation !== null,
    panelOpen: open,
    cursorRef: cursor,
    lastActivityAt,
    onPoll,
    onGone,
  });

  // Escape closes and returns focus to the launcher, which is the whole
  // keyboard contract here: there is deliberately no focus trap, because a real
  // one needs `ui/dialog.tsx` and this panel is non-modal.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleStart(input: StartInput) {
    setStarting(true);
    setStartError(null);

    const outcome = await startChat(input);
    setStarting(false);

    if (outcome.kind === "aborted") return;
    if (outcome.kind === "error") {
      setStartError(outcome.message);
      return;
    }

    setConversation(outcome.poll.conversation);
    setMessages(outcome.poll.messages);
    cursor.current = outcome.poll.cursor;
    setLastActivityAt(Date.now());
  }

  /**
   * Optimistic: the bubble appears immediately and is replaced by the confirmed
   * message when the POST answers. On failure it flips to "Not sent · Retry" —
   * there is no outbox, so nothing survives a reload mid-send.
   */
  const deliver = useCallback(
    async (entry: PendingMessage) => {
      const outcome = await sendChatMessage(entry.body, entry.file);

      if (outcome.kind === "aborted") return;

      if (outcome.kind === "gone") {
        onGone();
        return;
      }

      if (outcome.kind === "error") {
        setPending((current) =>
          current.map((item) =>
            item.tempId === entry.tempId ? { ...item, state: "failed" } : item,
          ),
        );
        return;
      }

      if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      setPending((current) => current.filter((item) => item.tempId !== entry.tempId));
      setMessages((current) => merge(current, [outcome.message]));
      if (outcome.cursor > cursor.current) cursor.current = outcome.cursor;
      setLastActivityAt(Date.now());
    },
    [onGone],
  );

  function handleSend(body: string | undefined, image: File | undefined) {
    const entry: PendingMessage = {
      tempId: nextTempId++,
      body,
      file: image,
      // Created in the handler rather than an effect, so it exists before the
      // first paint of the bubble. Revoked on confirm and on unmount.
      previewUrl: image ? URL.createObjectURL(image) : undefined,
      state: "sending",
    };

    setPending((current) => [...current, entry]);
    setLastActivityAt(Date.now());
    void deliver(entry);
  }

  function handleRetry(tempId: number) {
    setPending((current) => {
      const entry = current.find((item) => item.tempId === tempId);
      if (entry) void deliver({ ...entry, state: "sending" });
      return current.map((item) => (item.tempId === tempId ? { ...item, state: "sending" } : item));
    });
  }

  // Object URLs outlive the component otherwise.
  useEffect(
    () => () => {
      for (const entry of pending) {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      }
    },
    // Intentionally on unmount only: the confirm path revokes its own URL, and
    // listing `pending` here would revoke a preview still on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const unread = conversation?.unread ?? 0;
  const sentAnything = messages.some((message) => message.author === "visitor");

  return (
    <>
      {open ? (
        <ChatPanel
          panelId={panelId}
          titleId={titleId}
          conversation={conversation}
          onClose={() => {
            setOpen(false);
            launcher.current?.focus();
          }}
        >
          {conversation === null ? (
            <ChatPrechatForm
              busy={starting}
              error={startError}
              onStart={(input) => void handleStart(input)}
            />
          ) : (
            <>
              <ChatThread
                messages={messages}
                pending={pending}
                agentPresent={conversation.agentPresent}
                onRetry={handleRetry}
              />
              {conversation.status === "closed" ? (
                <p className="border-t border-border-subtle px-space-md py-space-sm text-label-sm text-text-muted">
                  This conversation has been closed.
                </p>
              ) : (
                <ChatComposer disabled={false} canAttach={sentAnything} onSend={handleSend} />
              )}
            </>
          )}
        </ChatPanel>
      ) : null}

      <button
        ref={launcher}
        type="button"
        data-print="hide"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread > 0 ? `Open chat, ${String(unread)} new replies` : "Open chat"}
        onClick={() => setOpen((current) => !current)}
        // z-40: UNDER the fixed z-50 header, so the launcher can never float
        // over the header's own menus. min-h-14 for a comfortable touch target.
        //
        // `max-sm:bottom-[calc(100lvh-100dvh+0.75rem)]` is what makes this
        // tappable on a phone at all. A `position: fixed` element is laid out
        // against the LARGE viewport, so mobile browser chrome — iOS Safari's
        // bottom toolbar in particular — is painted OVER anything near the
        // bottom edge, and taps land on the toolbar instead of the button.
        // `100lvh - 100dvh` is exactly the height of whatever chrome is
        // currently showing (zero when it is retracted), so this lifts the
        // launcher clear of it and drops back to 0.75rem when it hides.
        //
        // Scoped to `max-sm:` so desktop keeps the plain `bottom-3`, and left
        // as a second declaration so a browser without `lvh`/`dvh` simply drops
        // it and still gets `bottom-3`.
        className="fixed right-3 bottom-3 z-40 inline-flex min-h-14 min-w-14 items-center justify-center rounded-full bg-primary-container text-white shadow-lg transition-colors hover:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:outline-none max-sm:bottom-[calc(100lvh-100dvh+0.75rem)]"
      >
        <MessageCircle className="size-6 text-secondary-container" aria-hidden="true" />
        {unread > 0 && !open ? (
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 inline-flex min-w-5 items-center justify-center rounded-full bg-secondary-container px-1 text-label-sm font-bold text-on-primary-fixed"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </>
  );
}
