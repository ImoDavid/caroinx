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
   * Desktop-only affordance for a dropdown panel.
   *
   * NO ENTRY SETS THIS TODAY. Services was the only one, back when it promised
   * a Services menu and had no page at all; now it has a page, and a chevron
   * that opens nothing would be a worse lie than before — the row goes
   * somewhere, so the chevron would read as "there is more here" rather than as
   * "not built yet". Kept because the affordance is still the right one if a
   * real dropdown is ever added; the mobile panel ignores it either way.
   */
  readonly hasChevron: boolean;
};

// `as const satisfies` in that order, for the reason admin/nav-items.ts records:
// `as const` keeps the tuple type so index access stays non-optional under
// noUncheckedIndexedAccess, while `satisfies` still type-checks each entry.
export const NAV_LINKS = [
  { label: "Services", href: "/services", hasChevron: false },
  { label: "Tracking", href: "/track", hasChevron: false },
  { label: "Company", href: "/about", hasChevron: false },
  { label: "Contact", href: "/contact", hasChevron: false },
] as const satisfies readonly MarketingNavLink[];
