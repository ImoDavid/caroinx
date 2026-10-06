"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAdminChatPoll } from "@/components/admin/use-admin-chat-poll";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AdminPoll } from "@/types/chat";

/**
 * The unread-conversation count, and the only notification surface there is.
 *
 * This file used to promise it would "never render an unread-count badge", on
 * the grounds that a fabricated count is worse than an empty panel. That
 * principle survives in the form that actually mattered: the number here is
 * REAL — one endpoint, one `countDocuments` — and **zero renders no badge at
 * all**. Nothing is ever invented or rounded up to suggest activity.
 *
 * It owns the count because it is the one client component the shell mounts on
 * every admin route, which is also why it owns the `document.title` prefix
 * (rule 65). The `(dashboard)` layout does not re-render on client navigation,
 * so there is nowhere higher to put this.
 *
 * Known limit, and the feature's biggest hole: this is tab-local. With no email
 * transport and no web push, the admin learns about a new conversation only
 * while an admin tab is open — see gap 33.
 */
export function NotificationsButton() {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  const onPoll = useCallback((poll: AdminPoll) => {
    setUnread(poll.unread);
  }, []);

  useAdminChatPoll({
    // No conversationId: the bell fetches the count and nothing else, so it
    // never pays for a thread read.
    focused: false,
    lastActivityAt: 0,
    onPoll,
  });

  useEffect(() => {
    // Strip our OWN prefix first, so this is idempotent and cannot stack
    // "(1) (2) ". Next rewrites document.title from the new route's metadata on
    // every client navigation, which is why `pathname` is a dependency —
    // without it the prefix would vanish until the next poll.
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = unread > 0 ? `(${String(unread)}) ${base}` : base;
  }, [unread, pathname]);

  const label = unread > 0 ? `Notifications, ${String(unread)} unread` : "Notifications";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="relative size-11">
          <Bell className="size-[18px]" aria-hidden="true" />
          {/* aria-hidden: the count is already in the button's accessible name,
              so this is purely visual and is never the only way to learn it. */}
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-badge bg-destructive px-1 text-label-sm leading-4 text-white"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <h2 className="text-title-sm font-semibold">Notifications</h2>

        {unread > 0 ? (
          <>
            <p className="pt-space-xs text-body-sm text-muted-foreground">
              {unread === 1
                ? "1 conversation is waiting for a reply."
                : `${String(unread)} conversations are waiting for a reply.`}
            </p>
            <Button asChild size="lg" className="mt-space-sm min-h-11 w-full">
              <Link href="/admin/inbox?unread=1">Open the inbox</Link>
            </Button>
          </>
        ) : (
          <p className="pt-space-xs text-body-sm text-muted-foreground">
            Nothing waiting. New support conversations from the public site appear here.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
