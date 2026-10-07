import type { Metadata } from "next";

import { PreFooterCta } from "@/components/marketing/pre-footer-cta";
import { Divisions } from "@/components/marketing/services/divisions";
import { ServicesHero } from "@/components/marketing/services/services-hero";
import { TransportModes } from "@/components/marketing/services/transport-modes";

/**
 * The services page. Static — it reads no request APIs, so there is
 * deliberately no `export const dynamic`: it must prerender as `○`, and
 * `force-dynamic` would be dead configuration for the same reason `/track`
 * refuses it.
 *
 * Section order is also a background rhythm: navy hero, white, surface, and
 * `PreFooterCta` last because it carries bottom padding only and relies on the
 * section above it to supply the gap. `TransportModes` is therefore the light
 * `bg-surface` band — the same role `Principles` plays at the end of `/about`.
 * A navy section here would leave the CTA card butted against its edge.
 *
 * This page is the destination for three sets of links that were previously
 * `href="#"`: the header and mobile nav's Services entry, the landing grid's
 * per-card "Learn More" and its "Explore All …" link, and the footer's
 * Solutions column. Each anchored one targets a division slug from
 * `service-divisions.ts` — `typedRoutes` is off, so the only thing checking
 * them is `tests/components/services.test.tsx`.
 */

// A plain-string title, so the root layout's `"%s · True Global Route Logistics"`
// template applies. No `robots` — this page names nobody.
export const metadata: Metadata = {
  title: "Services",
  description:
    "The six divisions True Global Route Logistics operates — air, ocean, road and intermodal, secure and diplomatic freight, bonded warehousing and hazmat handling — and the four stages every consignment is tracked through.",
};

export default function ServicesPage() {
  return (
    <div className="flex w-full flex-col">
      <ServicesHero />
      <Divisions />
      <TransportModes />
      <PreFooterCta />
    </div>
  );
}
