import type { Metadata } from "next";

import { ChatMount } from "@/components/marketing/chat/chat-mount";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * Shell for the public, unauthenticated site.
 *
 * `(public)` is a route group, so it contributes nothing to the URL. This layout
 * wraps every route in the group — "/" and "/track".
 *
 * It stays typed `LayoutProps<"/">` regardless: Next's generated `LayoutRoutes`
 * is the set of paths where a layout.tsx FILE exists, not the set of routes a
 * layout wraps. Adding a `(public)/track/layout.tsx` WOULD change that, so don't.
 */
export const metadata: Metadata = {
  title: "True Global Route Logistics — Multimodal Freight Architecture",
  description:
    "True Global Route Logistics coordinates end-to-end multimodal transport, high-capacity ocean & air freight, and intelligent bonded warehousing with minute-by-minute satellite visibility.",
};

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#main"
        data-print="hide"
        className="sr-only bg-surface-white text-on-surface focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:px-4 focus:py-2 focus:ring-2 focus:ring-primary-container"
      >
        Skip to main content
      </a>
      {/* `light-only` pins the semantic tokens to their light values inside the
          public subtree. The marketing design is light-only and paints with the
          brand tokens, which cannot respond to `dark` anyway — this makes that
          guarantee hold even if a semantic-token utility is added here later,
          while the admin is in dark mode. */}
      <div className="light-only flex flex-1 flex-col bg-surface text-on-surface">
        <SiteHeader />
        {/* data-print="sheet": this is what survives onto paper, minus the
            fixed-header padding, which would otherwise be a blank band at the
            top of a printed tracking receipt. */}
        <main
          id="main"
          data-print="sheet"
          className="min-h-[calc(100vh-20rem)] w-full bg-surface pt-header"
        >
          {children}
        </main>
        <SiteFooter />
        {/* Last child of `light-only`, a sibling of the footer, and OUTSIDE
            `<main>` — which matters beyond semantics: a role="dialog" inside
            `main` would sit inside the skip link's own target. Inside
            `light-only` so the panel's shadcn-token surfaces stay light even
            while an admin tab has `<html class="dark">`. */}
        <ChatMount />
      </div>
    </>
  );
}
