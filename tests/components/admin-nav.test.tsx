import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminNav } from "@/components/admin/admin-nav";
import { ADMIN_NAV } from "@/components/admin/nav-items";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * AdminNav is prop-driven precisely so it can be rendered here: the `dom` Vitest
 * project has no `react-server` resolve condition, so anything reaching
 * `server-only` would throw.
 *
 * Links are asserted by `href` and never clicked — next/link outside a real App
 * Router context renders fine but would throw on navigation.
 */
function renderNav(activeSegment: string | null, onNavigate?: () => void) {
  // TooltipProvider is required: SidebarMenuButton wraps every item in a Tooltip
  // for the collapsed rail, and this shadcn style's SidebarProvider does not
  // supply one. The admin shell layout mounts it for the same reason.
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <AdminNav activeSegment={activeSegment} onNavigate={onNavigate} />
      </SidebarProvider>
    </TooltipProvider>,
  );
}

describe("AdminNav", () => {
  it("marks only the index item active at /admin", () => {
    renderNav(null);

    const overview = screen.getByRole("link", { name: "Overview" });
    const cargo = screen.getByRole("link", { name: "Cargo" });

    expect(overview).toHaveAttribute("aria-current", "page");
    expect(overview).toHaveAttribute("data-active", "true");

    expect(cargo).not.toHaveAttribute("aria-current");
    // Not merely "false": shadcn styles on attribute PRESENCE, so an inactive
    // item must carry no data-active attribute at all.
    expect(cargo).not.toHaveAttribute("data-active");
  });

  it("marks only the matching item active at /admin/cargo", () => {
    renderNav("cargo");

    const overview = screen.getByRole("link", { name: "Overview" });
    const cargo = screen.getByRole("link", { name: "Cargo" });

    expect(cargo).toHaveAttribute("aria-current", "page");
    expect(cargo).toHaveAttribute("data-active", "true");

    expect(overview).not.toHaveAttribute("aria-current");
    expect(overview).not.toHaveAttribute("data-active");
  });

  it("gives every item an accessible name and a destination", () => {
    renderNav(null);

    for (const item of ADMIN_NAV) {
      const link = screen.getByRole("link", { name: item.label });
      expect(link).toHaveAttribute("href", item.href);
    }

    expect(screen.getAllByRole("link")).toHaveLength(ADMIN_NAV.length);
  });

  /**
   * This is what closes the mobile sheet on navigation. An `onClick` rather
   * than an effect on `usePathname()`, both because
   * `react-hooks/set-state-in-effect` is an error in this directory and because
   * tapping the CURRENT route fires no pathname change — the case below.
   */
  describe("onNavigate", () => {
    /**
     * Swallows the default so jsdom does not attempt a real document
     * navigation (which it cannot do, and logs about). The React handler still
     * runs — that is the whole of what these cases assert.
     */
    function click(name: string) {
      const link = screen.getByRole("link", { name });
      link.addEventListener("click", (event) => {
        event.preventDefault();
      });
      fireEvent.click(link);
    }

    it("fires when an item is activated", () => {
      const onNavigate = vi.fn();
      renderNav(null, onNavigate);

      click("Cargo");

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it("fires for the item that is ALREADY active, where navigation is a no-op", () => {
      // The case an effect on usePathname() would miss: Next routes nowhere, so
      // no pathname change fires, and the sheet would stay open over the page
      // the user is already looking at.
      const onNavigate = vi.fn();
      renderNav(null, onNavigate);

      click("Overview");

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it("renders normally when it is omitted", () => {
      renderNav(null);

      expect(screen.getAllByRole("link")).toHaveLength(ADMIN_NAV.length);
    });
  });
});
