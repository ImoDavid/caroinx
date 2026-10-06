import type { Metadata } from "next";
import { Radar } from "lucide-react";

import { BrandCta } from "@/components/marketing/brand-cta";
import { ContactChannels } from "@/components/marketing/contact/contact-channels";
import { ContactOperations } from "@/components/marketing/contact/contact-operations";

/**
 * Contact. Static, like `/about` — no request APIs, so no `dynamic` export.
 *
 * There is deliberately NO form anywhere on this page. The application has no
 * email transport (see CLAUDE.md gap 2), so a posted form would have nowhere to
 * go, and a Server Action that logged a message and said "thanks" would be a
 * lie. Every channel is a `mailto:`, and the page says so rather than hiding it.
 *
 * It takes the lighter `/track` page-header treatment instead of `/about`'s navy
 * hero: someone arrives here with a task, and the addresses should be the first
 * thing they reach.
 */

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach True Global Route Logistics by email — dispatch for live consignments, support for tracking help and new freight enquiries. No account required.",
};

export default function ContactPage() {
  return (
    <div className="flex w-full flex-col">
      <div className="mx-auto w-full max-w-7xl px-margin py-space-xl md:px-margin-tablet md:py-space-2xl lg:px-margin-desktop">
        <span className="text-label-badge font-bold tracking-widest text-brand-olive uppercase">
          Contact
        </span>
        <h1 className="pt-1 font-display text-headline-lg-mobile text-primary-container sm:text-headline-lg">
          Tell us what needs moving
        </h1>
        <p className="max-w-prose pt-space-xs text-body-base text-on-surface-variant">
          There is no form on this page. Pick the desk below and your message opens in your own mail
          client, already addressed and with a subject filled in — so you keep a copy of what you
          sent and we can route it on arrival.
        </p>

        <div className="pt-space-md">
          {/* size="md" carries no gap of its own — only `lg` does. */}
          <BrandCta variant="gold" size="md" href="/track" className="min-h-11 gap-space-xs">
            <Radar aria-hidden="true" className="size-5" />
            <span>Checking on a shipment? Track it here</span>
          </BrandCta>
        </div>
      </div>

      <ContactChannels />
      <ContactOperations />
    </div>
  );
}
