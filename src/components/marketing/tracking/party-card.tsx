import { Mail, MapPin, PackageOpen, Phone, Send } from "lucide-react";

import { COUNTRY_NAMES, flagEmoji } from "@/lib/countries";
import type { TrackingParty } from "@/types/tracking";

/**
 * One end of the consignment.
 *
 * Contact details are shown on purpose — a deliberate product decision recorded
 * in CLAUDE.md gap 15, not an oversight. The sender has no email because
 * `senderSchema` collects none.
 */

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-space-xs">
      <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-label-sm text-text-muted">{label}</dt>
        <dd className="text-body-sm break-words text-on-surface">{children}</dd>
      </div>
    </div>
  );
}

export function PartyCard({ role, party }: { role: "sender" | "receiver"; party: TrackingParty }) {
  const RoleIcon = role === "sender" ? Send : PackageOpen;
  const heading = role === "sender" ? "Sender" : "Receiver";
  const headingId = `party-${role}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      data-print="block"
      className="rounded-2xl bg-surface-white p-space-md shadow-md sm:p-space-lg"
    >
      <h2
        id={headingId}
        className="flex items-center gap-space-xs font-display text-title-sm font-bold text-on-surface"
      >
        <RoleIcon className="size-[18px] shrink-0 text-primary-container" aria-hidden="true" />
        {heading}
      </h2>

      <p className="pt-space-xs text-body-lg font-bold break-words text-on-surface">{party.name}</p>

      <dl className="space-y-space-sm pt-space-sm">
        <Row icon={MapPin} label="Location">
          {party.country ? (
            <span className="inline-flex items-center gap-1.5">
              {/* aria-hidden: the country name beside it already says it, and
                  "flag: Nigeria, Nigeria" helps nobody. */}
              <span aria-hidden="true">{flagEmoji(party.country)}</span>
              {COUNTRY_NAMES[party.country]}
            </span>
          ) : null}
          {party.country ? " · " : null}
          {party.location}
        </Row>

        {party.phone ? (
          <Row icon={Phone} label="Phone">
            <a
              href={`tel:${party.phone}`}
              className="rounded underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none"
            >
              {party.phone}
            </a>
          </Row>
        ) : null}

        {party.email ? (
          <Row icon={Mail} label="Email">
            <a
              href={`mailto:${party.email}`}
              className="rounded underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none"
            >
              {party.email}
            </a>
          </Row>
        ) : null}
      </dl>
    </section>
  );
}
