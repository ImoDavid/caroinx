import {
  AlertTriangle,
  Check,
  type LucideIcon,
  PackageCheck,
  Truck,
  Warehouse,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { type ProgressStep, type StepState, trackingProgress } from "@/lib/tracking-progress";
import type { PublicShipment } from "@/types/tracking";
import { SHIPMENT_STATUS_LABELS } from "@/validations/shipment";

const STEP_ICON: Record<ProgressStep, LucideIcon> = {
  order_confirmed: PackageCheck,
  picked_by_courier: Warehouse,
  on_the_way: Truck,
  delivered: Check,
};

const STEP_CAPTION: Record<ProgressStep, string> = {
  order_confirmed: "We have your consignment details.",
  picked_by_courier: "Collected and checked in.",
  on_the_way: "Moving to the destination.",
  delivered: "Handed to the receiver.",
};

/**
 * Colour comes from the brand palette, not stock Tailwind and not new tokens:
 * gold already means "active" everywhere else on this site (the hero's live
 * ping, the console's old "Active Waypoint" node), and the brand has no
 * success/warning slot to add to. Colour is never the only signal — each state
 * carries its own glyph.
 */
const DOT_TONE: Record<StepState, string> = {
  complete: "bg-primary-container text-white",
  current: "bg-secondary-container text-on-primary-fixed motion-safe:animate-pulse",
  upcoming: "bg-surface-container-highest text-text-muted",
};

export function TrackingProgress({ shipment }: { shipment: PublicShipment }) {
  const { steps, held } = trackingProgress(shipment.status, shipment.history);

  return (
    <section
      aria-labelledby="tracking-progress-heading"
      data-print="block"
      className="rounded-2xl bg-surface-white p-space-md shadow-md sm:p-space-lg"
    >
      <h2
        id="tracking-progress-heading"
        className="font-display text-title-sm font-bold text-on-surface"
      >
        Shipment progress
      </h2>

      {/* The hold is a banner over the stepper rather than a fifth milestone:
          it is an exception a shipment enters and leaves from any point, and
          rendering it as step 4 of 5 would tell someone whose parcel is stuck at
          a border that it is nearly delivered. */}
      {held ? (
        <p className="mt-space-sm flex items-start gap-space-xs rounded-xl border border-brand-olive/30 bg-secondary-container/20 p-space-sm text-body-sm text-on-surface">
          <AlertTriangle
            className="mt-0.5 size-[18px] shrink-0 text-brand-olive"
            aria-hidden="true"
          />
          <span>
            <strong className="font-semibold">{SHIPMENT_STATUS_LABELS.customs_held}.</strong> Your
            consignment has reached a customs checkpoint and is waiting to be released. Progress
            resumes once it clears.
          </span>
        </p>
      ) : null}

      {/* Vertical at 320: four labels cannot fit across a phone without being
          truncated, and hiding them is not an option (responsive rule 3), so it
          reflows instead. */}
      <ol className="mt-space-md flex flex-col gap-0 sm:flex-row sm:gap-space-sm">
        {steps.map(({ step, state }, index) => {
          const Icon = state === "complete" ? Check : STEP_ICON[step];
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step}
              className="relative flex gap-space-sm sm:flex-1 sm:flex-col sm:gap-space-xs"
            >
              {/* The rail. Rendered behind the dot and never after the last step. */}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bg-surface-container-highest",
                    "top-9 left-[13px] h-[calc(100%-1.5rem)] w-0.5",
                    "sm:top-[13px] sm:left-[calc(50%+1.25rem)] sm:h-0.5 sm:w-[calc(100%-2.5rem)]",
                    state === "complete" && "bg-primary-container",
                  )}
                />
              ) : null}

              <span
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full sm:mx-auto",
                  DOT_TONE[state],
                  held && state === "current" && "ring-2 ring-brand-olive ring-offset-2",
                )}
              >
                {held && state === "current" ? (
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                ) : (
                  <Icon className="size-3.5" aria-hidden="true" />
                )}
              </span>

              <div className="pb-space-md sm:pb-0 sm:text-center">
                <p
                  className={cn(
                    "text-body-sm font-bold",
                    state === "upcoming" ? "text-text-muted" : "text-on-surface",
                  )}
                >
                  {SHIPMENT_STATUS_LABELS[step]}
                </p>
                <p className="text-label-sm text-text-muted">{STEP_CAPTION[step]}</p>
                {/* The announced state, so the stepper is not read as four
                    identical list items by a screen reader. */}
                <span className="sr-only">
                  {state === "complete"
                    ? "Completed"
                    : state === "current"
                      ? "Current"
                      : "Not yet reached"}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
