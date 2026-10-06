"use client";

import { CldImage } from "next-cloudinary";

import { cn } from "@/lib/utils";
import type { ShipmentPhoto } from "@/types/shipment";

/**
 * Renders a shipment's Cloudinary photo, or the empty state.
 *
 * Shared by the admin detail page and the PUBLIC tracking page. Everything it
 * paints with is a semantic token, which `.light-only` restates for the public
 * subtree, so it renders correctly in both.
 *
 * `"use client"` is required, not stylistic: next-cloudinary ships its dist with
 * NO "use client" directive, yet <CldImage> calls useState/useCallback — so a
 * Server Component importing it throws at runtime. This wrapper is the boundary
 * the package does not declare for itself.
 *
 * It is also the single import site for next-cloudinary, so "is that dependency
 * still worth it?" stays a one-file question. Note <CldImage> hands next/image a
 * custom `loader`, which bypasses Next's own optimizer entirely — that is why
 * next.config.ts needs no images.remotePatterns entry.
 */
export function ShipmentPhotoView({
  photo,
  trackingCode,
  className,
}: {
  photo?: ShipmentPhoto;
  trackingCode: string;
  /** Overrides the width cap; the public card is wider than the admin one. */
  className?: string;
}) {
  if (!photo) {
    return (
      <p className="text-body-sm text-muted-foreground">No photo was uploaded for this shipment.</p>
    );
  }

  return (
    // Full width on a phone, where the card is narrow anyway, but capped from sm
    // up: the card grows to the full content column on a desktop and an unbounded
    // photo would dominate the page. overflow-hidden keeps a wide image inside the
    // rounded border at 320px.
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-muted sm:max-w-xs md:max-w-sm",
        className,
      )}
    >
      <CldImage
        src={photo.publicId}
        // The stored intrinsic size, so the browser reserves the right box and the
        // page does not shift as the image loads — at any aspect ratio.
        width={photo.width}
        height={photo.height}
        // The tracking code rather than "shipment photo": the identifier is the
        // only thing we actually know about the image.
        alt={`Photo of shipment ${trackingCode}`}
        // Must track the max-widths above, or the largest candidate is served to a
        // phone and a desktop downloads far more pixels than it paints.
        sizes="(min-width: 768px) 24rem, (min-width: 640px) 20rem, 100vw"
        className="h-auto w-full"
      />
    </div>
  );
}
