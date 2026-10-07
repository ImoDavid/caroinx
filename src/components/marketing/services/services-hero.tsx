import { PlaneTakeoff, Radar, Shield } from "lucide-react";

import { BrandCta } from "@/components/marketing/brand-cta";
import { ChatCta } from "@/components/marketing/chat/chat-cta";
import { SERVICE_DIVISIONS } from "@/components/marketing/service-divisions";
import { TRANSPORT_TYPES } from "@/validations/shipment";

/**
 * The services page header.
 *
 * Every concrete number is either counted from the code — the division count
 * from `SERVICE_DIVISIONS`, the mode count from `TRANSPORT_TYPES` — or a claim
 * the site already publishes: `160+ countries` and the `AEO-F` / `IATA CNS`
 * badges come from `hero.tsx` and `site-footer.tsx`'s `FOOTER_CERTS`, repeated
 * rather than reworded so there is one version of them to correct. Nothing here
 * is a new assertion about the company (CLAUDE.md gap 21).
 *
 * `-mt-header` cancels the layout's `pt-header` and `pt-header-hero` restores
 * the clearance — so this only works as the page's FIRST child.
 */

const CERTS: readonly { readonly icon: typeof Shield; readonly label: string }[] = [
  { icon: Shield, label: "AEO-F certified" },
  { icon: PlaneTakeoff, label: "IATA CNS carrier" },
];

export function ServicesHero() {
  return (
    <section
      aria-labelledby="services-hero-heading"
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
        <span className="text-label-badge font-bold tracking-widest text-secondary-container uppercase">
          Services
        </span>
        <h1
          id="services-hero-heading"
          className="pt-space-xs font-display text-display-hero-mobile leading-none tracking-tight text-white md:text-display-hero"
        >
          {SERVICE_DIVISIONS.length} divisions, {TRANSPORT_TYPES.length} modes,{" "}
          <span className="text-secondary-container">one record.</span>
        </h1>
        <p className="max-w-2xl pt-space-md text-body-lg text-white/80">
          Whatever moves it, a consignment is registered once and carries one tracking code from
          collection to delivery. These are the divisions that handle it, and the stages you will
          see against it.
        </p>

        {/* flex-wrap, not a scroller: at 320px these stack rather than
            overflowing (responsive rule 2). */}
        <ul className="flex list-none flex-wrap items-center gap-x-space-lg gap-y-space-sm pt-space-md text-label-sm text-white/70">
          <li className="flex items-center gap-1.5">
            <Radar aria-hidden="true" className="size-[18px] shrink-0 text-secondary-container" />
            <span>160+ countries</span>
          </li>
          {CERTS.map((cert) => (
            <li key={cert.label} className="flex items-center gap-1.5">
              <cert.icon
                aria-hidden="true"
                className="size-[18px] shrink-0 text-secondary-container"
              />
              <span>{cert.label}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-space-md pt-space-lg">
          {/* The chat is the primary route: it is the only contact channel that
              gets a reply here rather than opening a mail client. */}
          <ChatCta
            className="inline-flex min-h-11 items-center gap-space-xs rounded-lg bg-secondary-container px-space-lg py-3 font-display text-body-sm font-bold text-on-primary-fixed no-underline shadow-md transition-all duration-200 hover:bg-secondary-hover focus-visible:ring-2 focus-visible:ring-secondary-container focus-visible:ring-offset-2 focus-visible:ring-offset-primary-container sm:px-space-xl sm:py-3.5 sm:text-title-sm"
            fallbackSubject="Freight enquiry"
          >
            Talk to the operations desk
          </ChatCta>
          <BrandCta variant="glass" size="lgGlass" href="/track">
            <Radar aria-hidden="true" className="size-5" />
            <span>Track a consignment</span>
          </BrandCta>
        </div>
      </div>
    </section>
  );
}
