import { ArrowRight, BadgeCheck, Radar } from "lucide-react";

import { BRAND } from "./brand";
import { BrandCta } from "./brand-cta";

export function PreFooterCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="w-full bg-surface pb-space-2xl sm:pb-space-section lg:pb-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="relative overflow-hidden rounded-3xl bg-primary-container p-space-xl text-white shadow-2xl md:p-space-2xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-brand-grid)_1px,transparent_1px)] [background-size:24px_24px] opacity-10"
          />
          <div className="relative z-10 mx-auto max-w-3xl space-y-space-md text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-label-badge font-bold tracking-wider text-secondary-container uppercase">
              <BadgeCheck className="size-4" />
              <span>Commercial Contract Freight</span>
            </div>
            <h2
              id="cta-heading"
              className="font-display text-headline-lg-mobile font-extrabold tracking-tight text-white sm:text-headline-lg md:text-display-hero"
            >
              Ready to Move Your Cargo with Absolute Confidence?
            </h2>
            <p className="text-body-lg text-white/80">
              Partner with True Global Route Logistics for competitive contract rates, guaranteed
              vessel allocation, and end-to-end supply chain transparency.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-space-md pt-space-sm">
              <BrandCta href="#">
                <span>Request a Free Freight Quote</span>
                <ArrowRight className="size-5" />
              </BrandCta>
              <BrandCta variant="glass" size="lgGlass" href="#">
                <Radar className="size-5" />
                <span>Track Existing Consignment</span>
              </BrandCta>
            </div>
            <div className="pt-space-md text-body-sm text-white/70">
              Urgent shipment dispatch? Direct 24/7 global operations desk:{" "}
              <a
                className="font-semibold break-all text-secondary-container hover:underline"
                href={`mailto:${BRAND.supportEmail}`}
              >
                {BRAND.supportEmail}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
