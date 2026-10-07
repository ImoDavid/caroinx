import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The Overview's headline numbers.
 *
 * Every value is a real count from a stored field. Zero renders as `0` — never
 * hidden, never rounded up to suggest activity — which is the principle
 * `notifications-button.tsx` already states for the unread badge.
 *
 * `grid-cols-2` at 320px: responsive rule 6 permits a two-column grid where the
 * cells are genuinely tiny, and a short number with a short label is that case.
 * One column here would push the rest of the page off a phone screen.
 */

export type MetricTile = {
  label: string;
  value: number;
  /** One line of context. Never a fabricated delta — nothing stores history. */
  hint: string;
  icon: LucideIcon;
  /** Where this number is actionable. */
  href?: string;
};

function TileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col gap-space-xs rounded-2xl bg-card p-space-md ring-1 ring-foreground/10">
      {children}
    </div>
  );
}

function TileBody({ tile }: { tile: MetricTile }) {
  return (
    <>
      <div className="flex items-center gap-space-xs text-muted-foreground">
        <tile.icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate text-label-sm font-medium">{tile.label}</span>
      </div>
      <p className="font-display text-headline-md-mobile font-bold tabular-nums md:text-headline-md">
        {tile.value}
      </p>
      <p className="text-label-sm text-pretty text-muted-foreground">{tile.hint}</p>
    </>
  );
}

export function MetricTiles({ tiles }: { tiles: readonly MetricTile[] }) {
  return (
    <ul className="grid list-none grid-cols-2 gap-space-sm lg:grid-cols-4 lg:gap-gutter">
      {tiles.map((tile) => (
        <li key={tile.label}>
          {tile.href ? (
            <Link
              href={tile.href}
              className="block h-full rounded-2xl transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              <TileShell>
                <TileBody tile={tile} />
              </TileShell>
            </Link>
          ) : (
            <TileShell>
              <TileBody tile={tile} />
            </TileShell>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Matches the tile grid so the page does not reflow when the data arrives. */
export function MetricTilesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-space-sm lg:grid-cols-4 lg:gap-gutter">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-space-xs rounded-2xl bg-card p-space-md ring-1 ring-foreground/10"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
