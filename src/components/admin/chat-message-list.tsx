"use client";

import { groupMessages } from "@/lib/chat-grouping";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

/**
 * The admin thread's message list.
 *
 * `"use client"` even though a Server Component also renders it: the live
 * wrapper renders the same list from client state, and a Server Component
 * cannot be rendered by a client one. Marking it client means ONE
 * implementation serves both — no duplicated bubble markup to drift apart
 * (rule 61).
 *
 * Prop-driven and free of `server-only`, so the `dom` test project can mount it.
 *
 * All grouping DECISIONS live in `lib/chat-grouping.ts`, not here — the same
 * split rule 43 requires of the poll schedule. This file only renders.
 *
 * Semantic tokens only (`bg-primary`, `bg-muted`, `text-muted-foreground`):
 * this is admin UI and must flip in dark mode, where the brand tokens cannot.
 */

const BUBBLE = "w-fit max-w-full px-space-md py-2 text-body-sm break-words";

/**
 * Corner radii that make a run read as one utterance.
 *
 * The side facing the author stays square between consecutive bubbles and
 * rounds off at the ends of the run — the convention every messaging client
 * uses, and the reason a run needs to know its own boundaries.
 */
function corners(own: boolean, first: boolean, last: boolean): string {
  if (first && last) return "rounded-2xl";
  if (own) {
    if (first) return "rounded-2xl rounded-br-md";
    if (last) return "rounded-2xl rounded-tr-md";
    return "rounded-2xl rounded-r-md";
  }
  if (first) return "rounded-2xl rounded-bl-md";
  if (last) return "rounded-2xl rounded-tl-md";
  return "rounded-2xl rounded-l-md";
}

export function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="py-space-lg text-center text-body-sm text-muted-foreground">
        No messages yet. This visitor opened a conversation but has not written anything.
      </p>
    );
  }

  const days = groupMessages(messages);

  return (
    <div role="log" className="flex flex-col gap-space-md">
      {days.map((day) => (
        <section key={day.key} className="flex flex-col gap-space-sm">
          {/* Absolute dates, not "Today"/"Yesterday". `lib/format.ts` pins every
              formatter to UTC so server and client cannot disagree (rule 59),
              and a relative label computed in UTC would be wrong for an admin
              in another zone — directly contradicting the times below it. */}
          <div className="flex items-center justify-center">
            <span className="rounded-full bg-muted px-space-sm py-0.5 text-label-sm text-muted-foreground">
              <time dateTime={day.key}>{formatDate(day.isoDate)}</time>
            </span>
          </div>

          <ul className="flex list-none flex-col gap-space-sm">
            {day.runs.map((run) => {
              const own = run.author === "admin";
              // A run is never empty — `groupMessages` creates one only when it
              // has a message to put in it — but the tail is read for the
              // timestamp, so it is narrowed rather than defaulted: a fallback
              // would hand `formatTime` an unparseable string.
              const tail = run.items.at(-1)?.message;

              return (
                <li
                  key={run.key}
                  className={cn("flex flex-col gap-0.5", own ? "items-end" : "items-start")}
                >
                  {/* Once per run, not once per bubble. */}
                  <p className="px-1 text-label-sm font-semibold text-muted-foreground">
                    {own ? "You" : "Visitor"}
                  </p>

                  <div
                    className={cn(
                      "flex max-w-[85%] flex-col gap-0.5 sm:max-w-[75%]",
                      own ? "items-end" : "items-start",
                    )}
                  >
                    {run.items.map(({ message, first, last }) => (
                      <div
                        key={message.seq}
                        className={cn(
                          BUBBLE,
                          corners(own, first, last),
                          own ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                        )}
                      >
                        {message.image ? (
                          // A plain <img> on purpose (rule 50): the delivery
                          // transform is already in the URL, so <CldImage>
                          // would need a publicId the DTO deliberately does not
                          // carry and next/image would need an
                          // images.remotePatterns entry rule 31 says is absent.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={message.image.url}
                            alt={own ? "Attachment you sent" : "Attachment from the visitor"}
                            width={message.image.width}
                            height={message.image.height}
                            loading="lazy"
                            className="mb-1 h-auto w-full max-w-72 rounded-xl"
                            style={{
                              aspectRatio: `${String(message.image.width)} / ${String(message.image.height)}`,
                            }}
                          />
                        ) : null}

                        {message.body ? (
                          <p className="whitespace-pre-wrap">{message.body}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Once per run, at its end — the time the exchange landed. */}
                  {tail ? (
                    <time
                      dateTime={tail.sentAt}
                      className="px-1 text-label-sm text-muted-foreground"
                    >
                      {formatTime(tail.sentAt)}
                    </time>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
