"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SHIPMENT_STATUSES, SHIPMENT_STATUS_LABELS } from "@/validations/shipment";

/**
 * Search and status filter, held entirely in the URL.
 *
 * No client state library and no fetching: changing a filter is a navigation,
 * so the Server Component re-queries, the result is shareable and
 * bookmarkable, and the Back button behaves. `page` is dropped on every change
 * because page 4 of the old result set is meaningless in the new one.
 */
export function ShipmentFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const hasFilters = currentQuery !== "" || currentStatus !== "";

  // Local state so typing stays responsive; the URL updates on submit.
  const [term, setTerm] = useState(currentQuery);

  function apply(next: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <div className="space-y-space-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: term, status: currentStatus });
        }}
        className="flex flex-wrap items-end gap-space-sm"
      >
        <div className="min-w-0 flex-1 space-y-space-xs sm:max-w-xs">
          <Label htmlFor="shipment-search">Search</Label>
          <Input
            id="shipment-search"
            name="q"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Tracking code, sender, receiver"
            className="min-h-11"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-space-xs sm:max-w-52">
          <Label htmlFor="shipment-status">Status</Label>
          <select
            id="shipment-status"
            value={currentStatus}
            onChange={(event) => apply({ q: term, status: event.target.value })}
            className={cn(
              "min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:text-sm dark:bg-input/30",
            )}
          >
            <option value="">All statuses</option>
            {SHIPMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SHIPMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" variant="outline" size="lg" className="min-h-11">
          <Search className="size-4" aria-hidden="true" />
          Search
        </Button>

        {hasFilters ? (
          <Button asChild variant="ghost" size="lg" className="min-h-11">
            <Link href={pathname} onClick={() => setTerm("")}>
              <X className="size-4" aria-hidden="true" />
              Clear
            </Link>
          </Button>
        ) : null}
      </form>

      {/* Announced so a screen-reader user learns the result count changed. */}
      <p role="status" className="text-body-sm text-muted-foreground">
        {total === 1 ? "1 shipment" : `${total.toLocaleString("en-GB")} shipments`}
        {hasFilters ? " matching your filters" : ""}
      </p>
    </div>
  );
}
