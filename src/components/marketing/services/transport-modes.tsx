import { type LucideIcon, PlaneTakeoff, Ship, TrainFront, Truck } from "lucide-react";

import { ArrowLink } from "@/components/marketing/arrow-link";
import { IconTile } from "@/components/marketing/icon-tile";
import { SectionHeading } from "@/components/marketing/section-heading";
import { TRANSPORT_TYPE_LABELS, TRANSPORT_TYPES } from "@/validations/shipment";

/**
 * The four modes a consignment can actually be recorded against.
 *
 * Read from `TRANSPORT_TYPES`, so this names exactly what the product supports
 * — add a mode to the schema and this section grows with it (CLAUDE.md
 * gap 21's discipline).
 *
 * Distinct from `about/network.tsx`, which also lists the modes: that section
 * is about reach ("160+ countries, four ways to get there"). This one is about
 * the RECORD — it tells a customer what the "Transport" line on their tracking
 * result means. Same enum, different question, so the icon map is local rather
 * than shared; coupling the two would mean a copy change on one page silently
 * editing the other.
 *
 * Light `bg-surface`, not navy: this is the last section before
 * `PreFooterCta`, which carries bottom padding only and shares this ground —
 * exactly the role `Principles` plays at the end of `/about`. On a navy band
 * the CTA card would sit against its edge with no gap.
 */

const MODE_ICONS: Record<(typeof TRANSPORT_TYPES)[number], LucideIcon> = {
  air: PlaneTakeoff,
  sea: Ship,
  road: Truck,
  rail: TrainFront,
};

const MODE_NOTES: Record<(typeof TRANSPORT_TYPES)[number], string> = {
  air: "Chosen when the date decides everything — expedited, charter and next-flight-out routing.",
  sea: "Chosen when volume decides it. Container and consolidated movements, port to port or door to door.",
  road: "The legs either end of everything else, plus cross-border linehaul and final-mile delivery.",
  rail: "Long inland distances where a train beats a convoy on both cost and emissions.",
};

export function TransportModes() {
  return (
    <section
      aria-labelledby="modes-heading"
      className="w-full bg-surface py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <SectionHeading
          id="modes-heading"
          eyebrow="How It Travels"
          title="The Mode Follows the Cargo"
          className="pb-space-2xl"
          trailing={
            <p className="max-w-md text-body-base text-text-muted">
              Every consignment is recorded against exactly one of these, and it is the mode shown
              on your tracking result.
            </p>
          }
        />

        <ul className="grid list-none grid-cols-1 gap-gutter-desktop sm:grid-cols-2 lg:grid-cols-4">
          {TRANSPORT_TYPES.map((mode) => (
            <li
              key={mode}
              className="space-y-space-sm rounded-2xl bg-surface-white p-space-lg shadow-sm transition-shadow duration-300 hover:shadow-md"
            >
              <IconTile icon={MODE_ICONS[mode]} />
              <h3 className="font-display text-title-sm font-bold text-primary-container">
                {TRANSPORT_TYPE_LABELS[mode]}
              </h3>
              <p className="text-body-sm text-text-muted">{MODE_NOTES[mode]}</p>
            </li>
          ))}
        </ul>

        <div className="pt-space-lg">
          <ArrowLink
            href="/track"
            className="min-h-11 gap-space-xs font-display text-title-sm font-bold text-primary-container transition-colors hover:text-primary-light"
          >
            See it on a consignment
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
