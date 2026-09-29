import { cva, type VariantProps } from "class-variance-authority";
import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const iconTileVariants = cva("flex items-center justify-center", {
  variants: {
    variant: {
      light: "bg-surface-container text-primary-container",
      onDark: "text-secondary-container bg-white/10",
      goldWash: "bg-secondary-container/20 text-primary-container",
    },
    size: {
      sm: "size-9 rounded-lg",
      md: "size-12 rounded-xl",
      lg: "size-14 rounded-2xl",
    },
  },
  defaultVariants: { variant: "light", size: "md" },
});

const ICON_SIZE = {
  sm: "size-5",
  md: "size-[26px]",
  lg: "size-8",
} as const;

type IconTileProps = {
  icon: LucideIcon;
  className?: string;
} & VariantProps<typeof iconTileVariants>;

/** The rounded icon square used by the service cards, pillars and feature cards. */
export function IconTile({ icon: Icon, variant, size, className }: IconTileProps) {
  return (
    <div className={cn(iconTileVariants({ variant, size }), className)}>
      <Icon className={ICON_SIZE[size ?? "md"]} />
    </div>
  );
}
