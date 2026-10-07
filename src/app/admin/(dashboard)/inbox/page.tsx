import type { Metadata } from "next";
import Link from "next/link";

import { ConversationList } from "@/components/admin/conversation-list";
import { InboxFilters } from "@/components/admin/inbox-filters";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { listConversations } from "@/services/chat.service";
import { chatListQuerySchema } from "@/validations/chat";

// Per-administrator and session-dependent: never prerendered or cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inbox",
};

function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
    if (target > 1) search.set("page", String(target));
    const queryString = search.toString();
    return queryString ? `/admin/inbox?${queryString}` : "/admin/inbox";
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-space-sm"
    >
      <p className="text-body-sm text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-space-sm">
        {page > 1 ? (
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href={href(page - 1)} rel="prev">
              Previous
            </Link>
          </Button>
        ) : null}
        {page < pageCount ? (
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href={href(page + 1)} rel="next">
              Next
            </Link>
          </Button>
        ) : null}
      </div>
    </nav>
  );
}

export default async function InboxPage({ searchParams }: PageProps<"/admin/inbox">) {
  // The security boundary for this page.
  await requireAdmin();

  const raw = await searchParams;
  // Search params are attacker-controlled; the schema `.catch()`es every field
  // so a hand-edited query string renders page 1 rather than an error.
  const query = chatListQuerySchema.parse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    unread: typeof raw.unread === "string" ? raw.unread : undefined,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });

  const { items, total, page, pageCount } = await listConversations(query);
  const filtered = Boolean(query.q ?? query.status ?? query.unread);

  return (
    <div className="space-y-space-lg">
      {/* The <h1> comes free from the topbar via navLabelForSegment, so admin
          pages start at <h2>. */}
      <h2 className="font-display text-headline-md">Conversations</h2>

      {/* No "that conversation was deleted" notice: nothing redirects here with
          ?deleted=1 any more, so the banner was unreachable. */}
      <InboxFilters total={total} />

      <ConversationList conversations={items} filtered={filtered} />

      <Pagination
        page={page}
        pageCount={pageCount}
        params={{ q: query.q, status: query.status, unread: query.unread ? "1" : undefined }}
      />
    </div>
  );
}
