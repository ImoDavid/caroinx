import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { verifySession } from "@/lib/auth/guards";

import { signOutAction } from "../actions";

// Reads cookies() and the session, so it must never be prerendered. Without
// this, `next build` would try to render the shell and open a database
// connection at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Overview", template: "%s · Admin" },
};

const SIGN_OUT_FORM_ID = "admin-sign-out";

export default async function AdminShellLayout({ children }: LayoutProps<"/admin">) {
  // NOT an authorization check, and deliberately not `requireAdmin()`.
  //
  // CLAUDE.md forbids putting the CHECK in a layout, and that still holds: every
  // page below calls requireAdmin(), and so does signOutAction(). The reasoning
  // there — layouts do not re-render on client navigation, do not gate sibling
  // segments, and do nothing for Server Actions — is about a check. This is a
  // READ, for the topbar's user menu, and it never redirects.
  //
  // It costs no extra query: verifySession() is cache()-wrapped, so the layout
  // and the page share one lookup per request.
  //
  // The null branch is unreachable in practice — with no session the page leaf's
  // requireAdmin() throws NEXT_REDIRECT and the response is aborted — so the
  // shell renders no user menu rather than a state it did not verify.
  const session = await verifySession();

  // shadcn's SidebarProvider writes this cookie on toggle; reading it here is
  // what makes the collapsed state survive a reload without a flash.
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    // SidebarProvider does NOT supply a TooltipProvider in this shadcn style,
    // and Tooltip does not self-wrap one — without this the collapsed-rail
    // tooltips throw.
    <TooltipProvider delayDuration={200}>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-popover focus:px-4 focus:py-2 focus:text-popover-foreground focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <SidebarProvider defaultOpen={defaultOpen}>
        <AdminSidebar />

        {/* SidebarInset renders the <main> element itself, so nothing below
            introduces a second one. */}
        <SidebarInset className="min-w-0 overflow-x-hidden">
          <AdminTopbar
            signOutFormId={SIGN_OUT_FORM_ID}
            user={
              session ? { name: session.name, email: session.email, role: session.role } : undefined
            }
          />

          <div
            id="admin-main"
            tabIndex={-1}
            className="min-w-0 flex-1 px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop"
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Rendered outside the dropdown on purpose: the menu item drives it via
          the HTML `form` attribute, so sign-out stays a plain form action that
          re-verifies server-side. */}
      <form id={SIGN_OUT_FORM_ID} action={signOutAction} className="hidden" />
    </TooltipProvider>
  );
}
