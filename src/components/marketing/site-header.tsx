import { ChevronDown, Headset, Languages, Search } from "lucide-react";
import Link from "next/link";

import { BrandCta } from "./brand-cta";
import { BrandLogo } from "./brand-logo";
import { MobileNav } from "./mobile-nav";
import { NAV_LINKS } from "./nav-links";

export function SiteHeader() {
  return (
    // data-print="hide": site chrome is not part of a printed tracking receipt.
    <header
      data-print="hide"
      className="fixed top-0 z-50 w-full shadow-[0_1px_8px_rgba(0,0,0,0.06)]"
    >
      {/* Utility bar */}
      <div className="border-b border-border-dark bg-primary-container text-on-primary-fixed">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-space-sm px-margin text-label-sm md:px-margin-tablet lg:px-margin-desktop">
          <div className="flex items-center gap-space-xs text-white/90">
            <Headset className="size-4 shrink-0 text-secondary-container" />
            <span className="font-medium">24/7 Global Dispatch</span>
          </div>
          {/* TODO(nav): region switcher is a visual placeholder; scope is homepage-only. */}
          <button
            type="button"
            aria-label="Change region and language"
            className="flex shrink-0 items-center gap-1 text-white/80 transition-colors hover:text-white"
          >
            <Languages className="size-4" />
            <span className="font-medium">Global / US EN</span>
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Primary bar */}
      <div className="border-b border-border-subtle bg-surface-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-space-sm px-margin md:px-margin-tablet lg:px-margin-desktop">
          <Link href="/" className="shrink-0">
            <BrandLogo tone="onLight" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-space-lg lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                className="flex items-center gap-1 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
                href={link.href}
              >
                {link.label}
                {link.hasChevron ? <ChevronDown className="size-4" aria-hidden="true" /> : null}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-space-xs sm:gap-space-sm">
            <Link
              className="flex min-h-11 items-center gap-space-xs rounded-lg border border-border-subtle bg-surface-container-low px-space-sm text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container sm:px-space-md"
              href="/track"
            >
              <Search className="size-[18px] shrink-0 text-text-muted" aria-hidden="true" />
              <span className="hidden sm:inline">Quick Track</span>
              <span className="sr-only sm:hidden">Quick Track</span>
            </Link>
            {/* Hidden below lg. NOT because it is duplicated — MobileNav's panel
                carries the tracking lookup instead — but because `href="#"`
                means it is inert everywhere, so hiding it costs no capability,
                and it buys the logo back ~114px at 320px.
                TODO(nav): when this gets a real destination it must become
                reachable on mobile again, or it IS a responsive rule 3
                violation. */}
            <BrandCta size="md" href="#" className="hidden min-h-11 lg:inline-flex">
              Request Quote
            </BrandCta>
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}
