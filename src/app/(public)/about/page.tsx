import type { Metadata } from "next";

import { AboutHero } from "@/components/marketing/about/about-hero";
import { Network } from "@/components/marketing/about/network";
import { OurWork } from "@/components/marketing/about/our-work";
import { Principles } from "@/components/marketing/about/principles";
import { PreFooterCta } from "@/components/marketing/pre-footer-cta";

/**
 * The company page. Static — it reads no request APIs, so there is deliberately
 * no `export const dynamic`: it must prerender as `○`, and `force-dynamic` would
 * be dead configuration for the same reason `/track` refuses it.
 *
 * Section order is also a background rhythm: navy hero, white, navy, surface,
 * and `PreFooterCta` last because it carries bottom padding only and relies on
 * the section above it to supply the gap.
 */

// A plain-string title, so the root layout's `"%s · True Global Route Logistics"`
// template applies. No `robots` — unlike a tracking result, this page names
// nobody, and gating it would be configuration that does nothing.
export const metadata: Metadata = {
  title: "About",
  description:
    "How True Global Route Logistics coordinates multimodal freight: one tracked record per consignment, appended not overwritten, across air, ocean, road and rail.",
};

export default function AboutPage() {
  return (
    <div className="flex w-full flex-col">
      <AboutHero />
      <OurWork />
      <Network />
      <Principles />
      <PreFooterCta />
    </div>
  );
}
