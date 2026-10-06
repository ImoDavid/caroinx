"use client";

import { ImageUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PHOTO_ACCEPT, PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/validations/shipment";

/**
 * The shipment photo picker: a drop zone with a thumbnail preview.
 *
 * It is progressive enhancement over a plain file input, not a replacement for
 * one. The real <input type="file"> is always in the form — only visually hidden
 * — so with JavaScript off the <label> still opens the native picker on click and
 * the bytes still post with the form. Everything below (preview, filename, drag
 * and drop, the clear button, the instant size check) is what JavaScript adds.
 *
 * The instant check matters more than it looks: the platform rejects an oversize
 * body BEFORE the Server Action runs, so without it a 10 MB pick surfaces as an
 * opaque network failure rather than as this field's own message.
 */

const MAX_MB = Math.round(PHOTO_MAX_BYTES / (1024 * 1024));

function describe(file: File): string {
  const mb = file.size / (1024 * 1024);
  const size = mb < 0.1 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${mb.toFixed(1)} MB`;
  return `${file.name} · ${size}`;
}

export function PhotoUploadField({
  id,
  name,
  describedBy,
  invalid,
}: {
  id: string;
  name: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** The live object URL, mirrored in a ref purely so unmount can revoke it. */
  const previewRef = useRef<string | null>(null);
  const [selected, setSelected] = useState<{ file: File; preview: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Revoked on unmount only. Replacement is handled in `accept` — creating the URL
  // in the event handler rather than in an effect keeps one blob alive at a time
  // without a cascading render.
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function replacePreview(file: File | null): void {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : null;
    setSelected(file && previewRef.current ? { file, preview: previewRef.current } : null);
  }

  function accept(file: File | undefined) {
    if (!file) {
      replacePreview(null);
      setLocalError(null);
      return;
    }

    // Mirrors shipmentPhotoSchema. The server re-checks; this is only for speed.
    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
      replacePreview(null);
      setLocalError("Upload a PNG, JPEG, WebP or AVIF image.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      replacePreview(null);
      setLocalError(`That image is larger than ${MAX_MB} MB.`);
      return;
    }

    setLocalError(null);
    replacePreview(file);
  }

  function clear() {
    // Clearing the input's value is what actually removes the file from the POST.
    if (inputRef.current) inputRef.current.value = "";
    accept(undefined);
    inputRef.current?.focus();
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);

    const dropped = event.dataTransfer.files;
    if (dropped.length === 0 || !inputRef.current) return;
    // Hand the dropped file to the real input so it posts with the form.
    inputRef.current.files = dropped;
    accept(dropped[0]);
  }

  const showError = Boolean(localError) || invalid;

  return (
    <div className="space-y-space-sm">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={PHOTO_ACCEPT}
        className="peer sr-only"
        aria-invalid={showError}
        aria-describedby={describedBy}
        onChange={(event) => accept(event.target.files?.[0])}
      />

      {/* A real <label htmlFor>, so a click opens the picker with no JavaScript.
          Keyboard users reach the input itself, and peer-focus-visible draws the
          ring here because the input is visually hidden. */}
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-11 cursor-pointer flex-col items-center gap-space-xs rounded-xl border border-dashed border-input bg-muted/40 px-space-md py-space-lg text-center transition-colors",
          "hover:border-ring hover:bg-muted/70",
          "peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          dragging && "border-ring bg-muted",
          showError && "border-destructive",
        )}
      >
        <ImageUp className="size-6 text-muted-foreground" aria-hidden="true" />
        <span className="text-body-sm font-medium">
          {selected ? "Choose a different image" : "Choose an image"}
        </span>
        {/* Wraps rather than truncates, so nothing overflows at 320px. */}
        <span className="text-label-sm break-words text-muted-foreground">
          or drag and drop · PNG, JPEG, WebP or AVIF up to {MAX_MB} MB
        </span>
      </label>

      {localError ? <p className="text-label-sm text-destructive">{localError}</p> : null}

      {selected ? (
        <div className="flex flex-wrap items-center gap-space-sm rounded-xl border border-border bg-card p-space-sm">
          {/* A plain <img>: the src is a local blob: URL, which next/image cannot
              optimise and must not be handed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.preview}
            alt={`Preview of ${selected.file.name}`}
            className="size-16 shrink-0 rounded-lg object-cover"
          />
          <p className="min-w-0 flex-1 text-label-sm break-words text-muted-foreground">
            {describe(selected.file)}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="min-h-11 shrink-0"
          >
            <X className="size-4" aria-hidden="true" />
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}
