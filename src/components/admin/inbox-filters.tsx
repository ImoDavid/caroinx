"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { NativeSelect } from "@/components/admin/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHAT_STATUSES } from "@/validations/chat";

/**
 * Search, status and unread filters, held entirely in the URL.
 *
 * Mirrors `shipment-filters.tsx` exactly: no client state library and no
 * fetching, because changing a filter is a navigation — the Server Component
 * re-queries, the result is shareable and bookmarkable, and Back behaves. `page`
 * is dropped on every change because page 4 of the old result set is meaningless
 * in the new one.
 */

const STATUS_LABELS: Record<string, string> = { open: "Open", closed: "Closed" };

export function InboxFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const unreadOnly = searchParams.get("unread") === "1";
  const hasFilters = currentQuery !== "" || currentStatus !== "" || unreadOnly;

  // Local state so typing stays responsive; the URL updates on submit.
  const [term, setTerm] = useState(currentQuery);

  function apply(next: Record<string, string | undefined>) {
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
          apply({ q: term });
        }}
        className="flex flex-wrap items-end gap-space-sm"
      >
        <div className="min-w-0 flex-1 space-y-space-xs sm:max-w-xs">
          <Label htmlFor="inbox-search">Search</Label>
          <Input
            id="inbox-search"
            name="q"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Name, email, message, code"
            className="min-h-11"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-space-xs sm:max-w-44">
          <Label htmlFor="inbox-status">Status</Label>
          <NativeSelect
            id="inbox-status"
            value={currentStatus}
            onChange={(event) => apply({ q: term, status: event.target.value })}
          >
            <option value="">All statuses</option>
            {CHAT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status] ?? status}
              </option>
            ))}
          </NativeSelect>
        </div>

        <Button type="submit" variant="outline" size="lg" className="min-h-11">
          <Search className="size-4" aria-hidden="true" />
          Search
        </Button>

        {/* `unread=1`, not a boolean: the query schema allow-lists affirmative
            spellings, because z.coerce.boolean() would read "0" as true. */}
        <Button
          type="button"
          variant={unreadOnly ? "default" : "outline"}
          size="lg"
          aria-pressed={unreadOnly}
          onClick={() => apply({ q: term, unread: unreadOnly ? undefined : "1" })}
          className="min-h-11"
        >
          Needs a reply
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
        {total === 1 ? "1 conversation" : `${total.toLocaleString("en-GB")} conversations`}
        {hasFilters ? " matching your filters" : ""}
      </p>
    </div>
  );
}
