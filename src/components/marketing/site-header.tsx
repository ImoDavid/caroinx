import { ChevronDown, Headset, Languages, Menu, Search } from "lucide-react";

import { BrandCta } from "./brand-cta";
import { BrandLogo } from "./brand-logo";

const NAV_LINKS = [
  { label: "Services", hasChevron: true },
  { label: "Tracking", hasChevron: false },
  { label: "Company", hasChevron: false },
] as const;

export function SiteHeader() {
  return (
    <header className="fixed top-0 z-50 w-full shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
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
          <a href="#" className="shrink-0">
            <BrandLogo tone="onLight" />
          </a>

          <nav aria-label="Main" className="hidden items-center gap-space-lg lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                className="flex items-center gap-1 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
                href="#"
              >
                {link.label}
                {link.hasChevron ? <ChevronDown className="size-4" /> : null}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-space-xs sm:gap-space-sm">
            <a
              className="flex min-h-11 items-center gap-space-xs rounded-lg border border-border-subtle bg-surface-container-low px-space-sm text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container sm:px-space-md"
              href="#"
            >
              <Search className="size-[18px] shrink-0 text-text-muted" />
              <span className="hidden sm:inline">Quick Track</span>
              <span className="sr-only sm:hidden">Quick Track</span>
            </a>
            <BrandCta size="md" href="#" className="min-h-11">
              Request Quote
            </BrandCta>
            {/* TODO(nav): mobile menu is a visual placeholder; scope is homepage-only.
                No aria-expanded/aria-controls — there is no panel to describe. */}
            <button
              type="button"
              aria-label="Open navigation menu"
              className="flex size-11 items-center justify-center text-on-surface lg:hidden"
            >
              <Menu className="size-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
