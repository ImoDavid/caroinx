"use client";

import { ImagePlus, SendHorizontal, X } from "lucide-react";
import { useRef, useState } from "react";

import {
  CHAT_IMAGE_ACCEPT,
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_MIME_TYPES,
  MESSAGE_MAX_CHARS,
} from "@/validations/chat";

/**
 * Client because it owns the draft, the attachment and an auto-growing textarea.
 * Part of `chat-launcher`'s island.
 */

const MAX_MB = (CHAT_IMAGE_MAX_BYTES / 1_000_000).toFixed(1);
/** Grows to roughly five lines, then scrolls inside itself. */
const MAX_TEXTAREA_PX = 128;

export type ChatComposerProps = {
  disabled: boolean;
  /** False until the visitor has sent one text message, per the server's rule. */
  canAttach: boolean;
  onSend: (body: string | undefined, image: File | undefined) => void;
};

export function ChatComposer({ disabled, canAttach, onSend }: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const textarea = useRef<HTMLTextAreaElement | null>(null);

  const empty = draft.trim() === "" && image === null;

  /**
   * Mirrors `chatImageSchema`, and is real UX rather than duplicate validation:
   * the oversize body is rejected by the handler's `content-length` check before
   * any field error can be produced, so without this a 4 MB pick surfaces as an
   * opaque 413. The server re-checks regardless.
   */
  function accept(file: File): boolean {
    if (!(CHAT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Attach a PNG, JPEG, WebP or AVIF image.");
      return false;
    }
    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      setError(`That image is larger than ${MAX_MB} MB.`);
      return false;
    }
    setError(null);
    return true;
  }

  function clearAttachment() {
    setImage(null);
    // The input must be reset too, or picking the same file again fires no
    // change event and the attachment silently fails to come back.
    if (fileInput.current) fileInput.current.value = "";
  }

  function submit() {
    if (empty || disabled) return;
    onSend(draft.trim() || undefined, image ?? undefined);
    setDraft("");
    clearAttachment();
    if (textarea.current) textarea.current.style.height = "auto";
  }

  return (
    <div className="border-t border-border-subtle px-space-md py-space-sm">
      {image ? (
        <div className="flex items-center gap-space-xs pb-space-xs">
          <span className="min-w-0 flex-1 truncate text-label-sm text-on-surface-variant">
            {image.name}
          </span>
          <button
            type="button"
            onClick={clearAttachment}
            aria-label="Remove attachment"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="pb-space-xs text-label-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="flex items-end gap-space-xs">
        <input
          ref={fileInput}
          type="file"
          accept={CHAT_IMAGE_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            if (!picked) return;
            if (accept(picked)) setImage(picked);
            else clearAttachment();
          }}
        />

        <button
          type="button"
          disabled={disabled || !canAttach}
          onClick={() => fileInput.current?.click()}
          aria-label={canAttach ? "Attach an image" : "Send a message before attaching an image"}
          title={canAttach ? "Attach an image" : "Send a message before attaching an image"}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none disabled:opacity-40"
        >
          <ImagePlus className="size-[18px]" aria-hidden="true" />
        </button>

        <label htmlFor="chat-draft" className="sr-only">
          Your message
        </label>
        <textarea
          id="chat-draft"
          ref={textarea}
          rows={1}
          value={draft}
          disabled={disabled}
          maxLength={MESSAGE_MAX_CHARS}
          placeholder="Type a message"
          onChange={(event) => {
            setDraft(event.target.value);
            // Auto-grow, capped — then the textarea scrolls rather than the
            // composer pushing the thread off the panel.
            const element = event.currentTarget;
            element.style.height = "auto";
            element.style.height = `${String(Math.min(element.scrollHeight, MAX_TEXTAREA_PX))}px`;
          }}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter newlines — but the Send button is always
            // visible, because on a touch keyboard Enter-to-send is a trap.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-32 min-h-11 w-full flex-1 resize-none rounded-xl bg-surface-container-low px-space-sm py-2.5 text-body-sm text-on-surface placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary-container focus:outline-hidden"
        />

        <button
          type="button"
          onClick={submit}
          disabled={disabled || empty}
          aria-label="Send message"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-white transition-colors hover:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none disabled:opacity-40"
        >
          <SendHorizontal className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
