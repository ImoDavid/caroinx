import {
  Gauge,
  Globe,
  Headset,
  LocateFixed,
  LockKeyhole,
  type LucideIcon,
  Route,
  Satellite,
  Star,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";

import { IconTile } from "./icon-tile";

type Pillar = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
};

const PILLARS: readonly Pillar[] = [
  {
    icon: LocateFixed,
    title: "Live Track & Trace",
    body: "Real-time status of your shipment with our advanced GPS-precision and AIS-tracking telematics.",
  },
  {
    icon: LockKeyhole,
    title: "Secure Bonded Warehousing",
    body: "Extensive network of operational facilities with state-of-the-art thermal and CCTV biometric monitoring.",
  },
  {
    icon: Gauge,
    title: "Express Global Delivery",
    body: "Diverse operating infrastructure ensuring swift turnarounds across all priority service tiers.",
  },
  {
    icon: Route,
    title: "Domestic & Cross-Border",
    body: "Next business day delivery for time-sensitive parcels with deep local regional coverage.",
  },
  {
    icon: Globe,
    title: "Worldwide Network Reach",
    body: "Direct corridors connecting US, Europe, Asia-Pacific, Latin America, and Middle Eastern hubs.",
  },
  {
    icon: Headset,
    title: "24/7 Logistics Command",
    body: "Direct desk access to seasoned multimodal forwarding specialists, never tiered chatbots.",
  },
];

function PillarCard({ pillar }: { pillar: Pillar }) {
  return (
    <div className="space-y-1.5 rounded-xl bg-surface-white p-space-md shadow-sm">
      <IconTile icon={pillar.icon} size="sm" />
      <h3 className="font-display text-title-sm font-bold text-primary-container">
        {pillar.title}
      </h3>
      <p className="text-body-sm text-text-muted">{pillar.body}</p>
    </div>
  );
}

export function WhyUs() {
  return (
    <section
      aria-labelledby="why-us-heading"
      className="w-full bg-surface py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-1 items-center gap-gutter-desktop lg:grid-cols-12">
          <div className="space-y-space-lg lg:col-span-7">
            <div>
              <span className="text-label-badge font-bold tracking-widest text-brand-olive uppercase">
                Why Choose Us
              </span>
              <h2
                id="why-us-heading"
                className="pt-1 font-display text-headline-lg-mobile text-primary-container sm:text-headline-lg"
              >
                Built for Mission-Critical Supply Chain Reliability
              </h2>
              <p className="max-w-xl pt-space-xs text-body-base text-text-muted">
                Trusted by enterprise procurement officers and defense contractors for
                uncompromising consistency, legal compliance, and technological rigor.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              {PILLARS.map((pillar) => (
                <PillarCard key={pillar.title} pillar={pillar} />
              ))}
            </div>
          </div>

          {/* Performance highlights */}
          <div className="space-y-space-md lg:col-span-5">
            <div className="space-y-space-md rounded-2xl bg-primary-container p-space-xl text-white shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-space-sm">
                <span className="text-label-badge font-bold tracking-wider text-secondary-container uppercase">
                  Industry Benchmark
                </span>
                <TrendingUp className="size-6 text-secondary-container" />
              </div>
              <div>
                <div className="font-display text-display-hero-mobile leading-none font-black text-white sm:text-display-hero">
                  99.8%
                </div>
                <div className="pt-1 font-display text-title-sm font-semibold text-secondary-container">
                  On-Time Cargo Delivery Rate
                </div>
                <p className="pt-space-xs text-body-sm text-white/70">
                  Audited performance benchmark maintained across air charters, scheduled maritime
                  lanes, and cross-border road express.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-surface-white p-space-lg shadow-sm">
              <div>
                <div className="text-label-sm font-semibold text-text-muted uppercase">
                  Real-Time Refresh
                </div>
                <div className="font-display text-headline-md text-primary-container">
                  Minute-by-Minute
                </div>
                <div className="text-body-sm text-text-muted">
                  Telemetry pings via multi-satellite constellations
                </div>
              </div>
              <IconTile icon={Satellite} variant="goldWash" size="lg" />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-surface-white p-space-lg shadow-sm">
              <div>
                <div className="flex items-center gap-1 pb-1 text-brand-olive">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} className="size-[18px] fill-current" />
                  ))}
                </div>
                <div className="font-display text-headline-md text-primary-container">
                  4.9 / 5.0 Rating
                </div>
                <div className="text-body-sm text-text-muted">
                  Over 16,000 verified commercial enterprise reviews
                </div>
              </div>
              <IconTile icon={ThumbsUp} size="lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
