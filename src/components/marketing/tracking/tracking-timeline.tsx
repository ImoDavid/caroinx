import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TrackingEvent } from "@/types/tracking";
import { SHIPMENT_STATUS_LABELS } from "@/validations/shipment";

/**
 * The public status history, newest first.
 *
 * A light-palette sibling of `components/admin/status-timeline.tsx` rather than
 * a shared component: that one paints with the admin's semantic tokens, and the
 * public subtree is pinned light and uses the brand palette.
 *
 * It renders `note`, which is intentional — CLAUDE.md rule 24 states the status
 * history is what the public timeline renders, so operators write those notes
 * knowing a customer reads them. It never renders `changedBy`; the public DTO
 * does not even carry it.
 */
export function TrackingTimeline({ events }: { events: readonly TrackingEvent[] }) {
  if (events.length === 0) {
    return (
      <section
        aria-labelledby="tracking-history-heading"
        data-print="block"
        className="rounded-2xl bg-surface-white p-space-md shadow-md sm:p-space-lg"
      >
        <h2
          id="tracking-history-heading"
          className="font-display text-title-sm font-bold text-on-surface"
        >
          Shipment history
        </h2>
        <p className="pt-space-sm text-body-sm text-text-muted">No updates recorded yet.</p>
      </section>
    );
  }

  const newestFirst = [...events].reverse();

  return (
    <section
      aria-labelledby="tracking-history-heading"
      data-print="block"
      className="rounded-2xl bg-surface-white p-space-md shadow-md sm:p-space-lg"
    >
      <h2
        id="tracking-history-heading"
        className="font-display text-title-sm font-bold text-on-surface"
      >
        Shipment history
      </h2>

      <ol className="pt-space-md">
        {newestFirst.map((event, index) => {
          const isNewest = index === 0;
          const isLast = index === newestFirst.length - 1;

          return (
            <li
              key={`${event.changedAt}-${event.status}`}
              className="relative flex gap-space-sm pb-space-md last:pb-0"
            >
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="absolute top-4 left-[5px] h-full w-0.5 bg-border-subtle"
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full",
                  isNewest ? "bg-primary-container" : "bg-surface-container-highest",
                )}
              />
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-on-surface">
                  {SHIPMENT_STATUS_LABELS[event.status]}
                </p>
                <p className="text-label-sm text-text-muted">
                  <time dateTime={event.changedAt}>{formatDateTime(event.changedAt)}</time>
                </p>
                {event.note ? (
                  <p className="pt-1 text-body-sm break-words text-on-surface-variant">
                    {event.note}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
