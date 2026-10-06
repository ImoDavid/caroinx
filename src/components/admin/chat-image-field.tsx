"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";

import { CHAT_IMAGE_ACCEPT, CHAT_IMAGE_MAX_BYTES, CHAT_IMAGE_MIME_TYPES } from "@/validations/chat";

/**
 * The reply composer's attach control.
 *
 * A NEW control rather than reusing `photo-upload-field.tsx`: different cap,
 * different copy, and a drop zone with a preview tile is right for a create form
 * and wrong for a one-line reply composer. That file stays untouched.
 *
 * The client-side size and type check is real UX, not duplicate validation —
 * same reasoning as gap 10. The server re-checks regardless.
 */

const MAX_MB = (CHAT_IMAGE_MAX_BYTES / 1_000_000).toFixed(1);

export type ChatImageFieldProps = {
  name: string;
  disabled?: boolean;
  /** Server-side error for this field, so it is shown in the same place. */
  error?: string;
};

export function ChatImageField({ name, disabled, error }: ChatImageFieldProps) {
  const input = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function clear() {
    setPicked(null);
    setLocalError(null);
    // Reset the input too, or picking the same file again fires no change event
    // and the attachment silently fails to come back.
    if (input.current) input.current.value = "";
  }

  const message = localError ?? error;

  return (
    <div className="space-y-space-xs">
      <input
        ref={input}
        type="file"
        name={name}
        accept={CHAT_IMAGE_ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          if (!(CHAT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
            setLocalError("Attach a PNG, JPEG, WebP or AVIF image.");
            clear();
            return;
          }
          if (file.size > CHAT_IMAGE_MAX_BYTES) {
            setLocalError(`That image is larger than ${MAX_MB} MB.`);
            clear();
            return;
          }

          setLocalError(null);
          setPicked(file);
        }}
      />

      <div className="flex flex-wrap items-center gap-space-xs">
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="inline-flex min-h-11 items-center gap-space-xs rounded-lg border border-border px-space-sm text-body-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden disabled:opacity-50"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {picked ? "Change image" : "Attach image"}
        </button>

        {picked ? (
          <>
            <span className="max-w-full min-w-0 truncate text-body-sm text-muted-foreground">
              {picked.name}
            </span>
            <button
              type="button"
              onClick={clear}
              aria-label="Remove attachment"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {message ? <p className="text-label-sm text-destructive">{message}</p> : null}
    </div>
  );
}
