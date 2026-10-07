import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The admin area's empty state.
 *
 * Extracted because the cargo list, the inbox list and the Overview all need
 * the same thing and the first two had drifted into two near-identical copies —
 * a third would have made the wording and the spacing impossible to keep in
 * step.
 *
 * A Server Component, prop-driven and free of `server-only`, so the `dom` test
 * project can render it.
 *
 * `ring-1 ring-foreground/10` rather than `border border-border`, matching
 * `ui/card.tsx` — the two copies this replaces used a border and sat visibly
 * differently from every Card beside them.
 */

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** A call to action. Omitted when the empty state is a filter result — there
   *  is nothing to create, only a filter to clear. */
  children?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-space-lg text-center ring-1 ring-foreground/10 sm:p-space-xl",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-foreground"
      >
        <Icon className="size-6" />
      </span>
      <h3 className="pt-space-sm font-display text-title-sm font-bold text-balance">{title}</h3>
      <p className="mx-auto max-w-prose pt-space-xs text-body-sm text-pretty text-muted-foreground">
        {description}
      </p>
      {children ? <div className="pt-space-md">{children}</div> : null}
    </div>
  );
}
