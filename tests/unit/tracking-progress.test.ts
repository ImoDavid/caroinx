import { describe, expect, it } from "vitest";

import { type PROGRESS_STEPS, type StepState, trackingProgress } from "@/lib/tracking-progress";
import type { TrackingEvent } from "@/types/tracking";
import type { ShipmentStatus } from "@/validations/shipment";

function event(status: ShipmentStatus, day: number): TrackingEvent {
  return { status, changedAt: `2026-03-${String(day).padStart(2, "0")}T09:00:00.000Z` };
}

/** The state of one named step, so assertions read as the UI reads. */
function stateOf(
  result: ReturnType<typeof trackingProgress>,
  step: (typeof PROGRESS_STEPS)[number],
): StepState | undefined {
  return result.steps.find((entry) => entry.step === step)?.state;
}

describe("trackingProgress", () => {
  it("renders four milestones and never customs_held as one of them", () => {
    const result = trackingProgress("on_the_way", [event("on_the_way", 3)]);

    expect(result.steps).toHaveLength(4);
    expect(result.steps.map((entry) => entry.step)).not.toContain("customs_held");
  });

  it("marks everything before the current step complete and everything after upcoming", () => {
    const result = trackingProgress("on_the_way", [
      event("order_confirmed", 1),
      event("picked_by_courier", 2),
      event("on_the_way", 3),
    ]);

    expect(stateOf(result, "order_confirmed")).toBe("complete");
    expect(stateOf(result, "picked_by_courier")).toBe("complete");
    expect(stateOf(result, "on_the_way")).toBe("current");
    expect(stateOf(result, "delivered")).toBe("upcoming");
    expect(result.held).toBe(false);
  });

  it("marks all four complete once delivered, with nothing left current", () => {
    const result = trackingProgress("delivered", [
      event("order_confirmed", 1),
      event("delivered", 4),
    ]);

    expect(result.steps.every((entry) => entry.state === "complete")).toBe(true);
  });

  it("moves the marker BACKWARDS when an operator corrects a status", () => {
    // Rule 24 permits going backwards. The stepper must follow, or a customer
    // sees four ticks beside a shipment that is still in transit.
    const result = trackingProgress("on_the_way", [
      event("order_confirmed", 1),
      event("on_the_way", 2),
      event("delivered", 3),
      event("on_the_way", 4),
    ]);

    expect(stateOf(result, "on_the_way")).toBe("current");
    expect(stateOf(result, "delivered")).toBe("upcoming");
  });

  it("flags a hold and anchors on the last real milestone reached", () => {
    const result = trackingProgress("customs_held", [
      event("order_confirmed", 1),
      event("picked_by_courier", 2),
      event("customs_held", 3),
    ]);

    expect(result.held).toBe(true);
    // The parcel physically got as far as being collected, so that is where the
    // marker sits — not at "on the way", and certainly not near "delivered".
    expect(stateOf(result, "picked_by_courier")).toBe("current");
    expect(stateOf(result, "on_the_way")).toBe("upcoming");
    expect(stateOf(result, "delivered")).toBe("upcoming");
  });

  it("does not throw when a shipment was created directly as held", () => {
    // No earlier milestone to anchor on. SHIPMENT_STATUSES places customs_held
    // after on_the_way, so that is the declared ordering's own reading.
    const result = trackingProgress("customs_held", [event("customs_held", 1)]);

    expect(result.held).toBe(true);
    expect(stateOf(result, "on_the_way")).toBe("current");
  });

  it("never leaves a delivered shipment showing as held", () => {
    const result = trackingProgress("delivered", [event("customs_held", 2), event("delivered", 3)]);

    expect(result.held).toBe(false);
    expect(stateOf(result, "delivered")).toBe("complete");
  });

  it("handles an empty history without throwing", () => {
    expect(() => trackingProgress("order_confirmed", [])).not.toThrow();
    expect(stateOf(trackingProgress("order_confirmed", []), "order_confirmed")).toBe("current");
  });
});
