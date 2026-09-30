import type { Metadata } from "next";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * Shell for the public, unauthenticated site.
 *
 * `(public)` is a route group, so it contributes nothing to the URL — this layout
 * wraps "/" and is typed LayoutProps<"/"> accordingly.
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
        <main id="main" className="min-h-[calc(100vh-20rem)] w-full bg-surface pt-header">
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
