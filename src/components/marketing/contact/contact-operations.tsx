import { Building2, Check, Mail } from "lucide-react";

import { ArrowLink } from "@/components/marketing/arrow-link";
import { BRAND } from "@/components/marketing/brand";
import { IconTile } from "@/components/marketing/icon-tile";

/**
 * What to send, and what this page deliberately cannot do.
 *
 * The checklist mirrors the fields `shipmentDetailsSchema`, `senderSchema` and
 * `receiverSchema` actually require, so asking for them is a true statement
 * about what we need rather than a guess.
 *
 * The three "does not do" rows are each true of the application today — no
 * public sign-up, no payment provider, no email transport — which is why they
 * can be stated plainly instead of apologised for.
 */

const CHECKLIST: readonly string[] = [
  "Your tracking code, if the consignment already exists.",
  "Where it travels from and to — country and city at both ends.",
  "What is moving, and roughly how heavy it is in kilograms.",
  "When it can ship, and the date it needs to arrive by.",
  "Whether it has to go by a particular mode, or has handling constraints.",
];

const LIMITS: readonly { readonly term: string; readonly detail: string }[] = [
  {
    term: "No account to create",
    detail:
      "Tracking needs no login. The code on your consignment receipt is the credential — there is nothing to sign up for and no password to lose.",
  },
  {
    term: "No online payment",
    detail:
      "A customs clearance charge is settled by email with the dispatch desk, quoting your tracking code.",
  },
  {
    term: "No automatic status emails",
    detail:
      "We do not send notifications. A consignment's current state always lives on the tracking page, which is accurate the moment you open it.",
  },
];

export function ContactOperations() {
  return (
    <section
      aria-labelledby="operations-heading"
      className="w-full bg-surface py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-1 items-start gap-gutter-desktop lg:grid-cols-12">
          <div className="space-y-space-lg lg:col-span-7">
            <div>
              <span className="text-label-badge font-bold tracking-widest text-brand-olive uppercase">
                Before You Write
              </span>
              <h2
                id="operations-heading"
                className="pt-1 font-display text-headline-lg-mobile text-primary-container sm:text-headline-lg"
              >
                What to Put in the Message
              </h2>
              <p className="max-w-xl pt-space-xs text-body-base text-text-muted">
                These are the details we need on the record anyway. Sending them first turns a
                three-email thread into one reply.
              </p>
            </div>

            <ul className="space-y-space-sm">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-space-sm">
                  <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-olive" />
                  <span className="min-w-0 text-body-base text-on-surface-variant">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-space-md lg:col-span-5">
            <div className="space-y-space-md rounded-2xl bg-primary-container p-space-lg text-white shadow-xl sm:p-space-xl">
              <h3 className="font-display text-title-sm font-bold text-secondary-container">
                Things this page deliberately does not do
              </h3>
              {/* A genuine term/definition list, matching tracking/shipment-facts.tsx. */}
              <dl className="space-y-space-sm">
                {LIMITS.map((limit) => (
                  <div
                    key={limit.term}
                    className="border-b border-white/10 pb-space-sm last:border-0 last:pb-0"
                  >
                    <dt className="font-display text-title-sm font-semibold text-white">
                      {limit.term}
                    </dt>
                    <dd className="pt-1 text-body-sm text-white/75">{limit.detail}</dd>
                  </div>
                ))}
              </dl>
              <ArrowLink
                href="/track"
                arrow="chevron"
                className="min-h-11 font-display text-title-sm font-semibold text-secondary-container transition-colors hover:text-white"
              >
                Track a consignment
              </ArrowLink>
            </div>

            <div className="space-y-space-sm rounded-2xl bg-surface-white p-space-lg shadow-sm">
              <IconTile icon={Building2} variant="goldWash" />
              <h3 className="font-display text-title-sm font-bold text-primary-container">
                Global operations
              </h3>
              <div className="text-body-sm text-text-muted">
                <p className="font-medium text-on-surface">World Trade Center, Ste 4800</p>
                <p>Rotterdam &amp; Houston</p>
              </div>
              <div className="pt-space-xs">
                <p className="text-label-sm font-semibold text-text-muted uppercase">
                  Dispatch desk · 24/7
                </p>
                <a
                  href={`mailto:${BRAND.dispatchEmail}`}
                  className="mt-1 inline-flex min-h-11 items-center gap-space-xs rounded-sm font-medium break-all text-primary-container underline underline-offset-4 transition-colors hover:text-primary-light focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:outline-hidden"
                >
                  <Mail aria-hidden="true" className="size-4 shrink-0" />
                  <span>{BRAND.dispatchEmail}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
