/**
 * The public site's primary destinations.
 *
 * Extracted from `site-header.tsx` so the desktop `<nav>` and the mobile panel
 * in `mobile-nav.tsx` read one table and cannot drift apart — the same reason
 * `admin/nav-items.ts` exists, and the same reason `BrandLogo` is shared by the
 * header and the footer.
 *
 * No directive and no imports: a Server Component and a client component both
 * read it.
 */

export type MarketingNavLink = {
  readonly label: string;
  readonly href: string;
  /**
   * Desktop-only affordance promising the Services dropdown that does not exist
   * yet. The mobile panel deliberately ignores it: a chevron that opens nothing
   * is worse on a touch target than on a hover target, where it at least reads
   * as "hover me".
   */
  readonly hasChevron: boolean;
};

// `as const satisfies` in that order, for the reason admin/nav-items.ts records:
// `as const` keeps the tuple type so index access stays non-optional under
// noUncheckedIndexedAccess, while `satisfies` still type-checks each entry.
export const NAV_LINKS = [
  // TODO(nav): Services has no page yet and no dropdown panel.
  { label: "Services", href: "#", hasChevron: true },
  { label: "Tracking", href: "/track", hasChevron: false },
  { label: "Company", href: "/about", hasChevron: false },
  { label: "Contact", href: "/contact", hasChevron: false },
] as const satisfies readonly MarketingNavLink[];
