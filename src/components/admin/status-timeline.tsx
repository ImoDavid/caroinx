import { formatDateTime } from "@/lib/format";
import type { ShipmentStatusEvent } from "@/types/shipment";
import { SHIPMENT_STATUS_LABELS } from "@/validations/shipment";

/**
 * The shipment's audit trail, newest first.
 *
 * An <ol> because the order is the meaning. The connecting line and dots are
 * decorative and hidden from assistive tech — the list semantics already convey
 * the sequence.
 */
export function StatusTimeline({ events }: { events: readonly ShipmentStatusEvent[] }) {
  if (events.length === 0) {
    return <p className="text-body-sm text-muted-foreground">No status changes recorded yet.</p>;
  }

  const newestFirst = [...events].reverse();

  return (
    <ol className="relative space-y-space-md">
      {newestFirst.map((event, index) => (
        <li key={`${event.changedAt}-${event.status}`} className="flex gap-space-sm">
          <div aria-hidden="true" className="flex flex-col items-center pt-1">
            <span
              className={
                index === 0
                  ? "size-2.5 shrink-0 rounded-full bg-primary"
                  : "size-2.5 shrink-0 rounded-full bg-border"
              }
            />
            {index < newestFirst.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-border" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 pb-space-xs">
            <p className="text-body-sm font-semibold">{SHIPMENT_STATUS_LABELS[event.status]}</p>
            <p className="text-label-sm text-muted-foreground">
              <time dateTime={event.changedAt}>{formatDateTime(event.changedAt)}</time>
            </p>
            {event.note ? (
              <p className="pt-space-xs text-body-sm break-words text-muted-foreground">
                {event.note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
