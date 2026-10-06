import { ArrowRight, Radar } from "lucide-react";

import { BrandCta } from "@/components/marketing/brand-cta";

/**
 * The navy band under the fixed header.
 *
 * `/about` is a marketing route in the same family as `/`, so it takes the
 * site's signature hero rather than `/track`'s light page header — that one is a
 * utility shell built around putting an input above the fold.
 *
 * Deliberately not a parameterised reuse of `hero.tsx`: that component is welded
 * to the homepage by its `priority` image, two HUD overlays and the overlapping
 * `TrackingConsole`. Stripping those out through props would cost five booleans
 * and read worse than the markup below.
 */
export function AboutHero() {
  return (
    // `-mt-header` cancels the layout's `pt-header` and `pt-header-hero`
    // restores the clearance — so this only works as the page's FIRST child.
    <section
      aria-labelledby="about-hero-heading"
      className="relative -mt-header w-full overflow-hidden bg-primary-container pt-header-hero pb-space-2xl text-white md:pb-space-section"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-primary-container via-brand-abyss to-brand-void"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 size-96 rounded-full bg-primary-light/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="max-w-3xl">
          <span className="text-label-badge font-bold tracking-widest text-secondary-container uppercase">
            Who We Are
          </span>

          <h1
            id="about-hero-heading"
            className="pt-space-xs font-display text-display-hero-mobile leading-none tracking-tight text-white md:text-display-hero"
          >
            One consignment. One code. One{" "}
            <span className="text-secondary-container">accountable record</span>.
          </h1>

          <p className="max-w-2xl pt-space-md text-body-lg text-white/80">
            True Global Route Logistics plans freight across modes rather than passing it between
            them. A consignment is registered once, carries one tracking code from collection to
            handover, and keeps one history that the sender and the receiver can both read.
          </p>

          {/* flex-wrap is required: two lg-size CTAs do not fit one 320px line. */}
          <div className="flex flex-wrap items-center gap-space-md pt-space-lg">
            <BrandCta href="/contact">
              <span>Talk to Our Desk</span>
              <ArrowRight className="size-5" />
            </BrandCta>
            <BrandCta variant="glass" size="lgGlass" href="/track">
              <Radar className="size-5" />
              <span>Track a Consignment</span>
            </BrandCta>
          </div>
        </div>
      </div>
    </section>
  );
}
