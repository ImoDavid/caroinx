"use client";

import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

/**
 * The admin thread's message list.
 *
 * `"use client"` even though step 7 only ever renders it from a Server
 * Component: the live wrapper added later renders the same list from client
 * state, and a Server Component cannot be rendered by a client one. Marking it
 * client now means ONE implementation serves both the server-rendered thread
 * and the polling one — no duplicated bubble markup to drift apart.
 *
 * Prop-driven and free of `server-only`, so the `dom` test project can mount it.
 *
 * Semantic tokens only (`bg-primary`, `bg-muted`, `text-muted-foreground`): this
 * is admin UI and must flip in dark mode, where the brand tokens cannot.
 */

const SHELL = "max-w-[85%] rounded-2xl px-space-md py-2.5 text-body-sm break-words";

export function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="py-space-lg text-center text-body-sm text-muted-foreground">
        No messages yet. This visitor opened a conversation but has not written anything.
      </p>
    );
  }

  return (
    <ul role="log" className="flex flex-col gap-space-sm">
      {messages.map((message) => {
        const own = message.author === "admin";

        return (
          <li key={message.seq} className={cn("flex", own ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                SHELL,
                own ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              <p
                className={cn(
                  "pb-0.5 text-label-sm font-semibold",
                  own ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {own ? "You" : "Visitor"}
              </p>

              {message.image ? (
                // A plain <img> on purpose (rule 50): the delivery transform is
                // already in the URL, so <CldImage> would need a publicId the
                // DTO deliberately does not carry and next/image would need an
                // images.remotePatterns entry rule 31 says is absent.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.image.url}
                  alt="Attachment from the visitor"
                  width={message.image.width}
                  height={message.image.height}
                  loading="lazy"
                  className="mb-1 h-auto w-full max-w-72 rounded-xl"
                  style={{ aspectRatio: `${message.image.width} / ${message.image.height}` }}
                />
              ) : null}

              {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}

              <time
                dateTime={message.sentAt}
                className={cn(
                  "block pt-1 text-label-sm",
                  own ? "text-primary-foreground/60" : "text-muted-foreground",
                )}
              >
                {formatTime(message.sentAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
