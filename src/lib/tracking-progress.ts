import type { TrackingEvent } from "@/types/tracking";
import type { ShipmentStatus } from "@/validations/shipment";

/**
 * Reduces a shipment's status and history into the public progress stepper.
 *
 * Client-safe: plain data, no dependencies.
 */

/**
 * The four stages a consignment actually passes through.
 *
 * `customs_held` is deliberately NOT one of them, even though SHIPMENT_STATUSES
 * lists it fourth of five. It is an exception a shipment can enter and leave
 * from any point: rendering it as step 4 of 5 would tell a customer whose parcel
 * is stuck at a border that it is nearly delivered, and would leave a
 * permanently-ticked "held" milestone behind once it was released. It is drawn
 * as a banner over the stepper instead.
 */
export const PROGRESS_STEPS = [
  "order_confirmed",
  "picked_by_courier",
  "on_the_way",
  "delivered",
] as const;

export type ProgressStep = (typeof PROGRESS_STEPS)[number];

export type StepState = "complete" | "current" | "upcoming";

export type TrackingProgress = {
  steps: { step: ProgressStep; state: StepState }[];
  held: boolean;
};

function isProgressStep(status: ShipmentStatus): status is ProgressStep {
  return (PROGRESS_STEPS as readonly ShipmentStatus[]).includes(status);
}

export function trackingProgress(
  status: ShipmentStatus,
  history: readonly TrackingEvent[],
): TrackingProgress {
  const held = status === "customs_held";

  // While held, the marker stays on the last real milestone the history records
  // — that is where the parcel physically got to. The fallback is `on_the_way`
  // rather than `order_confirmed` because SHIPMENT_STATUSES places customs_held
  // AFTER on_the_way, so "it reached a border" is the declared ordering's own
  // reading. It only matters for a shipment an operator created directly as
  // customs_held, which has no earlier entry to anchor on.
  const anchor: ProgressStep = held
    ? ([...history]
        .reverse()
        .map((event) => event.status)
        .find(isProgressStep) ?? "on_the_way")
    : isProgressStep(status)
      ? status
      : "on_the_way";

  const anchorIndex = PROGRESS_STEPS.indexOf(anchor);

  // The terminal step is "complete", never "current": nothing is pending once a
  // shipment is delivered.
  const finished = anchor === "delivered" && !held;

  return {
    held,
    // State comes from the CURRENT status's index, not from "has this step ever
    // appeared in the history". That is the whole point: an operator correcting
    // `delivered` back to `on_the_way` — which rule 24 explicitly permits — must
    // move the marker backwards rather than leave four ticks and a
    // contradiction. The history panel beside it still shows the full trail.
    steps: PROGRESS_STEPS.map((step, index) => ({
      step,
      state:
        index < anchorIndex || (finished && index === anchorIndex)
          ? "complete"
          : index === anchorIndex
            ? "current"
            : "upcoming",
    })),
  };
}
