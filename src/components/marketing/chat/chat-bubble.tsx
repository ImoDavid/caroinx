"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { VisitorMessage } from "@/types/chat-visitor";

/**
 * Client because it is part of `chat-launcher`'s island — it renders an object
 * URL and a retry button, neither of which exists on the server.
 */

/**
 * A message the browser has created but the server has not confirmed.
 *
 * Held in its own array rather than mixed into the confirmed list with a
 * negative `seq`: the confirmed list is sorted by `seq`, and a negative value
 * would sort an optimistic bubble to the TOP of the thread when it belongs at
 * the bottom. Two arrays rendered in order need no sort at all.
 */
export type PendingMessage = {
  /** Local only. Monotonic within the session; never sent anywhere. */
  tempId: number;
  body?: string;
  /** An object URL, so the attachment shows before it has been uploaded. */
  previewUrl?: string;
  file?: File;
  state: "sending" | "failed";
};

/** Shared so a pending bubble is visually the same object as a confirmed one. */
const SHELL = "max-w-[85%] rounded-2xl px-space-md py-2.5 text-body-sm break-words";
const OWN = "bg-primary-container text-white";
const THEIRS = "bg-surface-container-low text-on-surface";

export function ChatBubble({ message }: { message: VisitorMessage }) {
  const own = message.author === "visitor";

  return (
    <li className={cn("flex", own ? "justify-end" : "justify-start")}>
      <div className={cn(SHELL, own ? OWN : THEIRS)}>
        {!own ? (
          <p className="pb-0.5 text-label-sm font-semibold text-primary-container">Support</p>
        ) : null}

        {message.image ? (
          // A plain <img> on purpose (rule 50): the delivery transform is already
          // baked into the URL by the service, so <CldImage> would need a
          // publicId the DTO deliberately does not carry, and next/image would
          // need an images.remotePatterns entry that rule 31 says is absent.
          // Do not "fix" this by adding one.
          //
          // `aspect-ratio` from the ORIGINAL dimensions reserves the box so the
          // thread does not jump as the image loads.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.image.url}
            alt="Attachment"
            width={message.image.width}
            height={message.image.height}
            loading="lazy"
            className="mb-1 h-auto w-full max-w-64 rounded-xl"
            style={{ aspectRatio: `${message.image.width} / ${message.image.height}` }}
          />
        ) : null}

        {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}

        <p className={cn("pt-1 text-label-sm", own ? "text-white/60" : "text-text-muted")}>
          {formatTime(message.sentAt)}
        </p>
      </div>
    </li>
  );
}

export function PendingBubble({
  message,
  onRetry,
}: {
  message: PendingMessage;
  onRetry: (tempId: number) => void;
}) {
  const failed = message.state === "failed";

  return (
    <li className="flex justify-end">
      <div className={cn(SHELL, OWN, failed ? "opacity-100" : "opacity-70")}>
        {message.previewUrl ? (
          // A blob: object URL for a file that has not been uploaded yet, so
          // there is nothing for an image optimizer to fetch.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.previewUrl}
            alt="Attachment being sent"
            className="mb-1 h-auto w-full max-w-64 rounded-xl"
          />
        ) : null}

        {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}

        {failed ? (
          <div className="flex flex-wrap items-center gap-space-xs pt-1">
            <AlertCircle
              className="size-3.5 shrink-0 text-secondary-container"
              aria-hidden="true"
            />
            <span className="text-label-sm text-white/80">Not sent</span>
            <button
              type="button"
              onClick={() => {
                onRetry(message.tempId);
              }}
              className="inline-flex min-h-6 items-center gap-1 rounded-badge px-1.5 text-label-sm font-semibold text-secondary-container underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-secondary-container focus-visible:outline-none"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : (
          <p className="pt-1 text-label-sm text-white/60">Sending…</p>
        )}
      </div>
    </li>
  );
}
