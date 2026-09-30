"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Copies a short value (in practice, a tracking code) to the clipboard.
 *
 * The confirmation is announced via `role="status"` rather than only swapping
 * the icon, so the result is not conveyed by shape alone.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Without this, unmounting mid-timeout leaves a pending setState.
  useEffect(() => () => clearTimeout(timeout.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied (insecure origin, permissions policy).
      // Failing silently is right here: the value is visible next to the button
      // and selectable by hand, so there is nothing useful to tell the user.
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        onClick={() => void copy()}
        className="size-11 shrink-0"
      >
        {copied ? (
          <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </Button>
      <span role="status" className="sr-only">
        {copied ? `${value} copied to clipboard` : ""}
      </span>
    </>
  );
}
