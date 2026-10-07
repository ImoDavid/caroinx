"use client";

import { ChevronsLeft, Globe, Network } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { BRAND } from "@/components/marketing/brand";

import { AdminNav } from "./admin-nav";

/** Matches the marketing eyebrow idiom in `section-heading.tsx`. */
const GROUP_LABEL = "text-label-badge font-bold tracking-widest uppercase";

function BrandRow({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg" tooltip={BRAND.legalName}>
          <Link href="/admin" onClick={onNavigate}>
            <span
              aria-hidden="true"
              className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary-container ring-1 ring-sidebar-border"
            >
              <Network className="size-4 text-secondary-container" />
            </span>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate font-display text-label-sm font-extrabold tracking-tight">
                {BRAND.name}
              </span>
              <span className="truncate text-label-sm text-sidebar-foreground/70">Admin</span>
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function CollapseButton() {
  const { state, toggleSidebar, isMobile } = useSidebar();

  // Inside the mobile Sheet "Collapse" has no meaning — the Sheet has its own
  // close button and overlay. This is a control with no meaning in that context,
  // not content hidden to make something fit.
  if (isMobile) return null;

  const expanded = state === "expanded";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={toggleSidebar}
          aria-expanded={expanded}
          tooltip="Expand sidebar"
          className="min-h-11 text-sidebar-foreground/80"
        >
          <ChevronsLeft
            aria-hidden="true"
            className="transition-transform duration-200 group-data-[collapsible=icon]:rotate-180 motion-reduce:transition-none"
          />
          <span>{expanded ? "Collapse" : "Expand"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AdminSidebar() {
  // Returns null at /admin and "cargo" at /admin/cargo. Preferred over
  // usePathname(): it answers "which child segment is rendering?" directly, so
  // Overview needs no exact-match special case, and a future /admin/cargo/[code]
  // keeps Cargo highlighted with no code change.
  const activeSegment = useSelectedLayoutSegment();
  const { isMobile, setOpenMobile } = useSidebar();

  // Below `md` the sidebar IS a Sheet, so navigating without closing it leaves
  // the destination hidden behind the panel the user just used. Passed to every
  // destination in here — nav items, the brand row and the public-site link —
  // because "some links close it" is worse than none.
  //
  // `undefined` on desktop so no handler is attached at all where there is
  // nothing to close.
  const closeOnMobile = isMobile
    ? () => {
        setOpenMobile(false);
      }
    : undefined;

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <BrandRow onNavigate={closeOnMobile} />
      </SidebarHeader>

      <SidebarContent>
        {/* One nav landmark for both groups; the group labels are visual grouping. */}
        <nav aria-label="Admin sections">
          <SidebarGroup>
            <SidebarGroupLabel className={GROUP_LABEL}>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <AdminNav activeSegment={activeSegment} onNavigate={closeOnMobile} />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Labelled "Site", not "Support": the contact-support mailto was
              removed and this group now only leaves the admin area. The public
              site keeps its own support channels — this was a duplicate of
              them, not the only route to one. */}
          <SidebarGroup>
            <SidebarGroupLabel className={GROUP_LABEL}>Site</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Public site" className="min-h-11">
                    <Link href="/" onClick={closeOnMobile}>
                      <Globe aria-hidden="true" />
                      <span>Public site</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <CollapseButton />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
