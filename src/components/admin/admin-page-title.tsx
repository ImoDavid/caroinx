"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import { navLabelForSegment } from "./nav-items";

/**
 * The single <h1> for the admin application.
 *
 * Derived from the same nav table the sidebar uses, so the heading and the
 * highlighted nav item cannot disagree — and no page has to remember to pass a
 * title up. Admin pages therefore start their own headings at <h2>.
 */
export function AdminPageTitle({ className }: { className?: string }) {
  return <h1 className={className}>{navLabelForSegment(useSelectedLayoutSegment())}</h1>;
}
