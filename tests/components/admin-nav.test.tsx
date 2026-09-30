import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
function renderNav(activeSegment: string | null) {
  // TooltipProvider is required: SidebarMenuButton wraps every item in a Tooltip
  // for the collapsed rail, and this shadcn style's SidebarProvider does not
  // supply one. The admin shell layout mounts it for the same reason.
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <AdminNav activeSegment={activeSegment} />
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
});
