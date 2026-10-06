import { Radar, TriangleAlert } from "lucide-react";

import { ArrowLink } from "@/components/marketing/arrow-link";
import { PROGRESS_STEPS } from "@/lib/tracking-progress";
import {
  SHIPMENT_STATUS_LABELS,
  TRACKING_CODE_ALPHABET,
  TRACKING_CODE_BODY_LENGTH,
  TRACKING_CODE_PREFIX,
} from "@/validations/shipment";

/**
 * How a consignment is handled, told through the record the product actually
 * keeps.
 *
 * Every concrete claim here is read from the code rather than written as copy:
 * the milestones come from `PROGRESS_STEPS` and `SHIPMENT_STATUS_LABELS`, the
 * code format from the tracking-code constants. So this section cannot drift out
 * of step with what `/track` shows a customer — which is the whole reason to
 * state it on an about page at all.
 */

/** Keyed by the status values themselves, so a renamed step cannot orphan its copy. */
const MILESTONE_NOTES: Record<(typeof PROGRESS_STEPS)[number], string> = {
  order_confirmed:
    "The consignment is registered and its code issued. Sender, receiver, weight and declared contents are on the record before anything moves.",
  picked_by_courier:
    "Collected and signed for. Responsibility passes at a named point, not a vague one.",
  on_the_way:
    "In transit on the planned mode. Each change of state is appended as it happens rather than reconstructed afterwards.",
  delivered:
    "Handed over at the destination. The history stays readable after the fact, because that is when people need it.",
};

export function OurWork() {
  return (
    <section
      aria-labelledby="our-work-heading"
      className="w-full bg-surface-white py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-1 gap-gutter-desktop lg:grid-cols-12">
          <div className="space-y-space-lg lg:col-span-7">
            <div>
              <span className="text-label-badge font-bold tracking-widest text-brand-olive uppercase">
                Our Discipline
              </span>
              <h2
                id="our-work-heading"
                className="pt-1 font-display text-headline-lg-mobile text-primary-container sm:text-headline-lg"
              >
                Four Milestones, Appended Not Overwritten
              </h2>
              <p className="max-w-xl pt-space-xs text-body-base text-text-muted">
                A consignment passes through the same four states whatever it is carried on. We add
                to its history rather than rewriting it, so a correction is visible as a correction
                instead of quietly replacing what was shown yesterday.
              </p>
            </div>

            <ol className="space-y-space-md">
              {PROGRESS_STEPS.map((step, index) => (
                <li key={step} className="flex items-start gap-space-md">
                  <span
                    aria-hidden="true"
                    className="font-display text-headline-md-mobile leading-none font-black text-primary-container/20 sm:text-headline-md"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-title-sm font-bold text-primary-container">
                      {SHIPMENT_STATUS_LABELS[step]}
                    </h3>
                    <p className="pt-1 text-body-sm text-text-muted">{MILESTONE_NOTES[step]}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex items-start gap-space-sm rounded-xl bg-surface p-space-md">
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-brand-olive"
              />
              <p className="text-body-sm text-text-muted">
                <strong className="font-semibold text-primary-container">
                  {SHIPMENT_STATUS_LABELS.customs_held} is not a fifth milestone.
                </strong>{" "}
                It is an exception a consignment enters and leaves from any point, so we show it as
                a hold over the progress rather than as a step closer to the door. Telling someone
                whose parcel has stopped at a border that it is nearly delivered is worse than
                telling them nothing.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="space-y-space-md rounded-2xl bg-primary-container p-space-lg text-white shadow-xl sm:p-space-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-space-sm">
                <span className="text-label-badge font-bold tracking-wider text-secondary-container uppercase">
                  The Handle
                </span>
                <Radar aria-hidden="true" className="size-6 shrink-0 text-secondary-container" />
              </div>

              <div>
                {/* break-all: a display-size code will not fit a 320px card otherwise. */}
                <div className="font-display text-headline-lg-mobile leading-none font-black break-all text-white sm:text-headline-lg">
                  {TRACKING_CODE_PREFIX}-8F3K2QD7
                </div>
                <div className="pt-space-xs font-display text-title-sm font-semibold text-secondary-container">
                  The tracking code is the whole credential
                </div>
                <p className="pt-space-xs text-body-sm text-white/75">
                  {TRACKING_CODE_BODY_LENGTH} characters from an alphabet of{" "}
                  {TRACKING_CODE_ALPHABET.length}, generated when the consignment is created and
                  never chosen by hand. It carries no I, L, O or U — the characters people mishear
                  on a phone call and mistype off a label.
                </p>
              </div>

              <div className="border-t border-white/10 pt-space-md">
                <ArrowLink
                  href="/track"
                  arrow="chevron"
                  className="min-h-11 font-display text-title-sm font-semibold text-secondary-container transition-colors hover:text-white"
                >
                  Track with your code
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
