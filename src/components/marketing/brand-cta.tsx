import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The marketing call-to-action link.
 *
 * Deliberately separate from `@/components/ui/button`: these are anchors on a
 * light-only brand surface, and `ui/button.tsx` is app UI sized at h-8 with a
 * neutral-grey focus ring that is effectively invisible on the navy hero. It is
 * also owned by the shadcn CLI, which overwrites the file — brand variants added
 * there would disappear on the next `shadcn add`.
 */
const brandCtaVariants = cva(
  "font-display inline-flex items-center justify-center rounded-lg transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        gold: "bg-secondary-container text-on-primary-fixed hover:bg-secondary-hover focus-visible:ring-primary-container focus-visible:ring-offset-surface-white shadow-md",
        glass:
          "focus-visible:ring-secondary-container focus-visible:ring-offset-primary-container bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
      },
      // Mobile-first: each size starts at its small-screen footprint and steps up.
      size: {
        md: "px-space-sm py-space-sm text-body-sm font-bold shadow-sm active:scale-95 sm:px-space-lg sm:text-title-sm",
        lg: "gap-space-xs px-space-lg py-3 text-body-sm font-bold active:scale-95 sm:px-space-xl sm:py-3.5 sm:text-title-sm sm:hover:-translate-y-0.5",
        lgGlass:
          "gap-space-xs px-space-md py-3 text-body-sm sm:px-space-lg sm:py-3.5 sm:text-title-sm",
      },
    },
    defaultVariants: { variant: "gold", size: "lg" },
  },
);

type BrandCtaProps = React.ComponentProps<"a"> & VariantProps<typeof brandCtaVariants>;

// A plain <a> rather than next/link: every destination is "#" for now, and Link
// would attach prefetch machinery to a no-op route.
export function BrandCta({ className, variant, size, ...props }: BrandCtaProps) {
  return <a className={cn(brandCtaVariants({ variant, size }), className)} {...props} />;
}
