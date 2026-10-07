"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Visitor details on a phone, where the desktop sidebar column does not exist.
 *
 * A bottom sheet rather than a block under the header: the thread is the
 * screen's job, and details are a thing you consult, not a thing you read
 * alongside. Opening from the sticky header means it stays one tap away however
 * long the conversation gets — the problem this redesign exists to fix.
 *
 * `Sheet` is already in `components/ui/`, so this needs no shadcn addition.
 * Radix handles the focus trap, the Escape key and `aria-modal` properly, which
 * is why this is a real modal and the public chat panel (gap 24) is not.
 *
 * Content is passed in as `children` so the SAME `<ConversationMeta>` the
 * desktop column renders is what appears here — one implementation, rendered in
 * two places, rather than a mobile copy that drifts.
 */
export function ConversationDetailsSheet({
  visitorName,
  children,
}: {
  visitorName: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="min-h-11 px-3">
          <Info className="size-4" aria-hidden="true" />
          Details
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        // Capped and scrollable: the meta list is long enough to exceed a phone
        // screen on its own, and dvh (never vh) keeps the bottom clear of the
        // browser's own chrome.
        className="max-h-[85dvh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{visitorName}</SheetTitle>
          <SheetDescription>
            Who the visitor is, and where they were when the conversation started.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
