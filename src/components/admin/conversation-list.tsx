import { Inbox, MessageSquare } from "lucide-react";
import Link from "next/link";

import { CountryLabel } from "@/components/admin/country-label";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { ConversationSummary } from "@/types/chat";

/**
 * The inbox list.
 *
 * Deliberately NOT `DataTable`. A row here is a name, a one-line preview, a
 * timestamp and an unread count — that is a list, not a table, and the cargo
 * table already scrolls horizontally on a phone (gap 9's lesson). A `<ul>` of
 * `<Link>` cards reflows instead of scrolling sideways.
 *
 * A Server Component, prop-driven and free of `server-only`, so the `dom` test
 * project can render it — which is what makes everything the inbox page shows
 * testable even though the page itself is not.
 *
 * Semantic tokens only: this is admin UI and must flip in dark mode.
 */

export type ConversationListProps = {
  conversations: ConversationSummary[];
  filtered: boolean;
};

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-space-xl text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-foreground"
      >
        <Inbox className="size-6" />
      </span>
      <h3 className="pt-space-sm font-display text-title-sm font-bold">
        {filtered ? "No conversations match those filters" : "No conversations yet"}
      </h3>
      <p className="pt-space-xs text-body-sm text-muted-foreground">
        {filtered
          ? "Try a different name, status, or clear the filters."
          : "When a visitor opens the chat widget on the public site, their conversation appears here."}
      </p>
    </div>
  );
}

export function ConversationList({ conversations, filtered }: ConversationListProps) {
  if (conversations.length === 0) return <EmptyState filtered={filtered} />;

  return (
    <ul className="space-y-space-sm">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <Link
            href={`/admin/inbox/${conversation.id}`}
            className="flex min-h-11 flex-col gap-space-xs rounded-2xl border border-border bg-card p-space-md transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="font-display text-title-sm font-bold">
                {conversation.visitorName}
              </span>

              {/* The count is in TEXT, not conveyed by colour alone. */}
              {conversation.unread > 0 ? (
                <Badge variant="destructive">
                  {conversation.unread} unread
                  <span className="sr-only"> message{conversation.unread === 1 ? "" : "s"}</span>
                </Badge>
              ) : null}

              {conversation.status === "closed" ? <Badge variant="outline">Closed</Badge> : null}

              {conversation.trackingCode ? (
                <Badge variant="secondary" className="font-mono">
                  {conversation.trackingCode}
                </Badge>
              ) : null}
            </div>

            {conversation.lastMessagePreview ? (
              <p className="line-clamp-2 text-body-sm text-muted-foreground">
                {conversation.lastMessageFrom === "admin" ? (
                  <span className="font-medium text-foreground">You: </span>
                ) : null}
                {conversation.lastMessagePreview}
              </p>
            ) : (
              <p className="text-body-sm text-muted-foreground italic">No messages yet</p>
            )}

            {/* flex-wrap, so this row reflows at 320px rather than overflowing. */}
            <div className="flex flex-wrap items-center gap-x-space-sm gap-y-0.5 text-label-sm text-muted-foreground">
              <time dateTime={conversation.lastMessageAt}>
                {formatDateTime(conversation.lastMessageAt)}
              </time>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3.5" aria-hidden="true" />
                {conversation.messageCount}
                <span className="sr-only">
                  {" "}
                  message{conversation.messageCount === 1 ? "" : "s"}
                </span>
              </span>
              <CountryLabel code={conversation.countryCode} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
