"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * There is no notification system yet, so this shows an honest empty state that
 * says what the panel is for and what unlocks it. Deliberately never renders an
 * unread-count badge — a fabricated count would be worse than an empty panel.
 */
export function NotificationsButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="size-11">
          <Bell className="size-[18px]" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <h2 className="text-title-sm font-semibold">Notifications</h2>
        <p className="pt-space-xs text-body-sm text-muted-foreground">
          Nothing yet. Once cargo codes are live, status changes and failed lookups will appear
          here.
        </p>
      </PopoverContent>
    </Popover>
  );
}
