import Link from "next/link";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

import { ADMIN_NAV } from "./nav-items";

/**
 * The workspace nav list.
 *
 * Deliberately prop-driven rather than calling `useSelectedLayoutSegment()`
 * itself: that keeps it renderable under jsdom (the `dom` Vitest project has no
 * `react-server` resolve condition), and makes the active-state rule injectable.
 * `admin-sidebar.tsx` is the client boundary that reads the segment.
 *
 * `onNavigate` follows the same rule, and is how the mobile sheet closes on
 * navigation. It is an `onClick` and NOT an effect on `usePathname()` for two
 * reasons: `react-hooks/set-state-in-effect` is an error across
 * `src/components/admin/**`, and tapping the item for the CURRENT route
 * navigates nowhere and fires no pathname change — so an effect would leave the
 * sheet open exactly when the user expects it to close. Same reasoning as the
 * marketing mobile nav (CLAUDE.md rule 69).
 */
export function AdminNav({
  activeSegment,
  onNavigate,
}: {
  activeSegment: string | null;
  onNavigate?: () => void;
}) {
  return (
    <SidebarMenu>
      {ADMIN_NAV.map((item) => {
        const isActive = item.segment === activeSegment;

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              // SidebarMenuButton sets `data-active={isActive}`, and React
              // renders a false boolean data-* attribute as the STRING "false"
              // — while its own variants use `data-active:` which Tailwind
              // compiles to a presence check, `[data-active]`. Left alone, every
              // item would render with the active background. `{...props}` is
              // spread last inside the component, so passing `undefined` here
              // removes the attribute entirely on inactive items.
              data-active={isActive || undefined}
              tooltip={item.label}
              className="relative min-h-11 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-transparent data-[active=true]:font-semibold data-[active=true]:before:bg-sidebar-primary"
            >
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
              >
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
