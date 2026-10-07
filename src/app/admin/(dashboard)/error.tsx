"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The admin area's error boundary.
 *
 * An `error.tsx` must be a Client Component — React needs `reset` to be a
 * callable passed across the boundary — and it catches RENDER errors only. A
 * throw during module evaluation is not recoverable by anything, here or
 * elsewhere.
 *
 * The digest is surfaced on purpose: in production Next replaces the real
 * message with that hash before it reaches the browser, so it is the only
 * handle anyone has to match a screenshot against a server log.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-prose rounded-2xl bg-card p-space-lg text-center ring-1 ring-foreground/10 sm:p-space-xl">
      <span
        aria-hidden="true"
        className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-foreground"
      >
        <AlertTriangle className="size-6" />
      </span>

      {/* The topbar owns the <h1>. */}
      <h2 className="pt-space-sm font-display text-title-sm font-bold">
        This screen could not load
      </h2>
      <p className="pt-space-xs text-body-sm text-pretty text-muted-foreground">
        Something failed while loading this page. Trying again often works — the data itself is
        unaffected.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-space-sm pt-space-md">
        <Button type="button" size="lg" onClick={reset} className="min-h-11">
          Try again
        </Button>
      </div>

      {error.digest ? (
        <p className="pt-space-md text-label-sm text-muted-foreground">
          Reference <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
