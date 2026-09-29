import Image from "next/image";
import {
  ArrowRight,
  Boxes,
  Gavel,
  type LucideIcon,
  Radar,
  Satellite,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";

import { BrandCta } from "./brand-cta";
import { TrackingConsole } from "./tracking-console";

const TRUST_CALLOUTS: readonly { readonly icon: LucideIcon; readonly label: string }[] = [
  { icon: ShieldCheck, label: "AEO-F & IATA Certified" },
  { icon: Satellite, label: "Real-Time GPS Telematics" },
  { icon: Zap, label: "Sub-60min Rate Quotes" },
];

const HUD_STATS: readonly {
  readonly icon: LucideIcon;
  readonly value: string;
  readonly label: string;
}[] = [
  { icon: Timer, value: "99.8%", label: "ETA Accuracy" },
  { icon: Gavel, value: "24/7", label: "Port Customs Cleared" },
];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative -mt-header w-full overflow-hidden bg-primary-container pt-header-hero pb-space-2xl text-white md:pb-space-section"
    >
      {/* Ambient backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-primary-container via-brand-abyss to-brand-void"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 size-96 rounded-full bg-primary-light/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/4 h-[32rem] w-[32rem] rounded-full bg-secondary-container/5 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-1 items-center gap-gutter-desktop lg:grid-cols-12">
          {/* Value proposition */}
          <div className="flex flex-col space-y-space-md lg:col-span-7">
            <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1 self-start rounded-full bg-white/10 px-space-md py-1.5 shadow-sm backdrop-blur-md">
              <span className="relative flex size-2.5 shrink-0">
                <span className="absolute inline-flex size-full rounded-full bg-secondary-container opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2.5 rounded-full bg-secondary-container" />
              </span>
              <span className="text-label-badge font-bold tracking-wider text-secondary-container uppercase">
                160+ Countries Active Operations
              </span>
              <span aria-hidden="true" className="text-white/40">
                |
              </span>
              <span className="hidden text-label-sm text-white/80 sm:inline">
                Multimodal Dispatch Active
              </span>
            </div>

            <h1
              id="hero-heading"
              className="pt-space-xs font-display text-display-hero-mobile leading-none tracking-tight text-white md:text-display-hero"
            >
              Engineered for Precision Across{" "}
              <span className="text-secondary-container">Continents</span> &amp; Oceans.
            </h1>

            <p className="max-w-2xl pt-space-xs text-body-lg text-white/80">
              True Global Route Logistics coordinates end-to-end multimodal transport, high-capacity
              ocean &amp; air freight, and intelligent bonded warehousing with minute-by-minute
              satellite visibility.
            </p>

            <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
              <BrandCta href="#">
                <span>Get a Free Freight Quote</span>
                <ArrowRight className="size-5" />
              </BrandCta>
              <BrandCta variant="glass" size="lgGlass" href="#">
                <Boxes className="size-5" />
                <span>Explore Multimodal Services</span>
              </BrandCta>
            </div>

            <div className="flex flex-wrap items-center gap-x-space-lg gap-y-space-sm pt-space-sm text-label-sm text-white/70">
              {TRUST_CALLOUTS.map((callout) => (
                <div key={callout.label} className="flex items-center gap-1.5">
                  <callout.icon className="size-[18px] shrink-0 text-secondary-container" />
                  <span>{callout.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual showcase with HUD overlays */}
          <div className="relative mt-space-lg lg:col-span-5 lg:mt-0">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-primary-light/40 shadow-2xl lg:aspect-[5/4]">
              <Image
                src="/header_image.png"
                alt="Ocean container cargo vessel docked at an illuminated commercial deepwater shipping terminal at blue dusk, with towering yellow container cranes, stacked freight containers, and reflective harbour water."
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-primary-container via-transparent to-transparent opacity-80"
              />

              <div className="absolute top-2 right-2 left-2 flex items-center justify-between gap-2 rounded-xl bg-brand-abyss/85 p-2 text-white shadow-lg backdrop-blur-md sm:top-4 sm:right-4 sm:left-4 sm:p-3">
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <Image
                    src="/brand/logo-mark.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 shrink-0 rounded-badge bg-white object-contain p-0.5"
                  />
                  <div className="min-w-0">
                    <div className="text-label-badge tracking-wider text-secondary-container uppercase">
                      Live Fleet Ping
                    </div>
                    <div className="text-body-sm font-semibold text-white">
                      4,820 Active TEU en route to Rotterdam
                    </div>
                  </div>
                </div>
                <Radar className="size-5 shrink-0 text-secondary-container motion-safe:animate-pulse" />
              </div>

              <div className="absolute right-2 bottom-2 left-2 grid grid-cols-2 gap-2 sm:right-4 sm:bottom-4 sm:left-4">
                {HUD_STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex min-w-0 items-center gap-2 rounded-lg bg-brand-abyss/90 p-2 shadow-md backdrop-blur-md sm:p-2.5"
                  >
                    <stat.icon className="size-5 shrink-0 text-secondary-container" />
                    <div className="min-w-0">
                      <div className="font-display text-headline-md-mobile leading-none text-white sm:text-headline-md">
                        {stat.value}
                      </div>
                      <div className="text-label-sm text-white/70">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Overlapping telematics console */}
        <div className="relative z-20 mt-space-xl lg:-mb-14">
          <TrackingConsole />
        </div>
      </div>
    </section>
  );
}
