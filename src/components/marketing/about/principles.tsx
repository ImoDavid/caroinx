import {
  Compass,
  Headset,
  History,
  Layers,
  type LucideIcon,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

import { IconTile } from "@/components/marketing/icon-tile";
import { SectionHeading } from "@/components/marketing/section-heading";

type Principle = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
};

const PRINCIPLES: readonly Principle[] = [
  {
    icon: Layers,
    title: "One record, not several",
    body: "A consignment is registered once and carries one code. There is no second system holding a different version of where it got to.",
  },
  {
    icon: Compass,
    title: "The mode follows the cargo",
    body: "Air, ocean, road and rail are routing options rather than departments. The mode is chosen from what the freight needs, not from what is easiest to book.",
  },
  {
    icon: ScrollText,
    title: "Paperwork travels with the freight",
    body: "Weight, declared contents, origin, destination and dates sit against the consignment itself — not in somebody's inbox, where they stop being findable.",
  },
  {
    icon: History,
    title: "Corrections stay visible",
    body: "History is appended, never overwritten. If an operator fixes a mistake, the fix reads as a fix instead of silently replacing what was shown before.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance before movement",
    body: "Declarations and handling constraints are settled before a consignment leaves, because a border is an expensive place to discover a missing document.",
  },
  {
    icon: Headset,
    title: "A desk, not a queue",
    body: "An exception is a conversation with someone who can act on it. We would rather tell you the freight has stopped than show a reassuring estimate.",
  },
];

function PrincipleCard({ principle }: { principle: Principle }) {
  return (
    <div className="space-y-space-sm rounded-2xl bg-surface-white p-space-lg shadow-sm transition-shadow duration-300 hover:shadow-md">
      <IconTile icon={principle.icon} />
      <h3 className="font-display text-title-sm font-bold text-primary-container">
        {principle.title}
      </h3>
      <p className="text-body-base text-text-muted">{principle.body}</p>
    </div>
  );
}

export function Principles() {
  return (
    <section
      aria-labelledby="principles-heading"
      className="w-full bg-surface py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <SectionHeading
          id="principles-heading"
          eyebrow="How We Work"
          title="Principles That Hold Under Pressure"
          className="pb-space-2xl"
          trailing={
            <p className="max-w-md text-body-base text-text-muted">
              Freight goes wrong at the handoffs. These are the habits that decide what happens when
              it does.
            </p>
          }
        />

        <div className="grid grid-cols-1 gap-gutter-desktop md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <PrincipleCard key={principle.title} principle={principle} />
          ))}
        </div>
      </div>
    </section>
  );
}
