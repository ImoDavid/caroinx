import { LayoutDashboard, Package, type LucideIcon } from "lucide-react";

export type AdminNavItem = {
  /**
   * The route segment directly below `/admin` that this item owns, as
   * `useSelectedLayoutSegment()` reports it from the shell layout. `null` is the
   * index page (`/admin`).
   */
  readonly segment: string | null;
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
};

// `as const satisfies` in that order: `as const` keeps the tuple type so index
// access stays non-optional under noUncheckedIndexedAccess, while `satisfies`
// still type-checks each entry. Same reasoning as marketing/tracking-console.tsx.
export const ADMIN_NAV = [
  { segment: null, href: "/admin", label: "Overview", icon: LayoutDashboard },
  { segment: "cargo", href: "/admin/cargo", label: "Cargo", icon: Package },
] as const satisfies readonly AdminNavItem[];

/**
 * The topbar heading and the sidebar read this same table, so the page title and
 * the highlighted nav item cannot drift apart.
 */
export function navLabelForSegment(segment: string | null): string {
  return ADMIN_NAV.find((item) => item.segment === segment)?.label ?? "Admin";
}
