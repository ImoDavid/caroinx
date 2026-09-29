import { Network } from "lucide-react";

import { cn } from "@/lib/utils";

import { BRAND } from "./brand";

type BrandLogoProps = {
  /**
   * Only the surface treatment differs between the two placements — the mark,
   * its icon and the wordmark are identical in both.
   */
  tone?: "onLight" | "onDark";
  className?: string;
};

/**
 * The logo mark plus wordmark, shared by the site header and the site footer so
 * the two can never drift apart.
 */
export function BrandLogo({ tone = "onDark", className }: BrandLogoProps) {
  return (
    <span className={cn("flex items-center gap-space-sm", className)}>
      <span
        className={cn(
          "rounded-lg p-1.5",
          tone === "onDark" ? "bg-white/10" : "bg-primary-container",
        )}
      >
        <Network className="size-6 text-secondary-container sm:size-7" />
      </span>
      <span
        className={cn(
          "font-display text-headline-md-mobile tracking-tight sm:text-headline-md",
          tone === "onDark" ? "text-white" : "text-primary-container",
        )}
      >
        {BRAND.name}
      </span>
    </span>
  );
}
