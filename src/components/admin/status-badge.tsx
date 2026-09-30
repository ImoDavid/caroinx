import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from "@/validations/shipment";

/**
 * Colour carries meaning here, so it is never the ONLY signal — the label is
 * always rendered alongside it. Tints are written with explicit light/dark pairs
 * because the semantic tokens have no "warning" or "success" slot.
 */
const STATUS_TONE: Record<ShipmentStatus, string> = {
  order_confirmed: "bg-muted text-foreground",
  picked_by_courier: "bg-sky-500/15 text-sky-900 dark:text-sky-200",
  on_the_way: "bg-sky-500/15 text-sky-900 dark:text-sky-200",
  customs_held: "bg-amber-500/20 text-amber-900 dark:text-amber-200",
  delivered: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
};

export function StatusBadge({ status, className }: { status: ShipmentStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("whitespace-nowrap", STATUS_TONE[status], className)}>
      {SHIPMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
