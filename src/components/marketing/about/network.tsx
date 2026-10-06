import {
  Headset,
  type LucideIcon,
  PlaneTakeoff,
  Ship,
  Shield,
  TrainFront,
  Truck,
} from "lucide-react";

import { ArrowLink } from "@/components/marketing/arrow-link";
import { TRANSPORT_TYPE_LABELS, TRANSPORT_TYPES } from "@/validations/shipment";

/**
 * The reach section.
 *
 * The four modes are read from `TRANSPORT_TYPES`, so this names exactly the
 * modes a consignment can actually be recorded against. The coverage, desk and
 * certification lines are the claims the site already makes in `hero.tsx`,
 * `site-header.tsx` and `site-footer.tsx` — repeated here rather than restated
 * differently, so there is one version of them to correct.
 */

const MODE_ICONS: Record<(typeof TRANSPORT_TYPES)[number], LucideIcon> = {
  air: PlaneTakeoff,
  sea: Ship,
  road: Truck,
  rail: TrainFront,
};

const MODE_NOTES: Record<(typeof TRANSPORT_TYPES)[number], string> = {
  air: "Time-critical and expedited consignments.",
  sea: "Container and consolidated ocean movements.",
  road: "Linehaul, cross-border and final-mile delivery.",
  rail: "Intermodal legs over long inland distances.",
};

export function Network() {
  return (
    <section
      aria-labelledby="network-heading"
      className="relative w-full overflow-hidden bg-primary-container py-space-2xl text-white sm:py-space-section lg:py-space-section-desktop"
    >
      {/* The committed, generated map — a CSS background rather than next/image,
          matching tracking/route-map.tsx. Purely atmospheric here. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/brand/world-map.svg')] bg-contain bg-center bg-no-repeat opacity-15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full bg-primary-light/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-1 gap-gutter-desktop lg:grid-cols-12">
          <div className="space-y-space-md lg:col-span-5">
            <span className="text-label-badge font-bold tracking-widest text-secondary-container uppercase">
              Where We Operate
            </span>
            <h2
              id="network-heading"
              className="font-display text-headline-lg-mobile text-white sm:text-headline-lg"
            >
              160+ Countries, Four Ways to Get There
            </h2>
            <p className="max-w-xl text-body-base text-white/75">
              Coverage is only useful if someone answers when a consignment stops. Our dispatch desk
              runs around the clock, and the record you read is the record we work from.
            </p>

            <dl className="space-y-space-sm pt-space-xs">
              <div className="flex items-start gap-space-sm">
                <Headset
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-secondary-container"
                />
                <div className="min-w-0">
                  <dt className="font-display text-title-sm font-semibold text-white">
                    24/7 global dispatch
                  </dt>
                  <dd className="text-body-sm text-white/70">
                    One desk, every time zone, no tiered handoff.
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-space-sm">
                <Shield
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-secondary-container"
                />
                <div className="min-w-0">
                  <dt className="font-display text-title-sm font-semibold text-white">
                    AEO-F certified · IATA CNS carrier
                  </dt>
                  <dd className="text-body-sm text-white/70">
                    Customs-recognised and air-cargo endorsed.
                  </dd>
                </div>
              </div>
            </dl>

            <div className="pt-space-xs">
              <ArrowLink
                href="/contact"
                className="min-h-11 font-display text-title-sm font-bold text-secondary-container transition-colors hover:text-white"
              >
                Ask about a lane
              </ArrowLink>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:col-span-7">
            {TRANSPORT_TYPES.map((mode) => {
              const Icon = MODE_ICONS[mode];

              return (
                <div
                  key={mode}
                  className="space-y-space-sm rounded-2xl border border-white/10 bg-white/5 p-space-md backdrop-blur-sm sm:p-space-lg"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-white/10">
                    <Icon aria-hidden="true" className="size-[26px] text-secondary-container" />
                  </div>
                  <h3 className="font-display text-title-sm font-bold text-white">
                    {TRANSPORT_TYPE_LABELS[mode]}
                  </h3>
                  <p className="text-body-sm text-white/70">{MODE_NOTES[mode]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
