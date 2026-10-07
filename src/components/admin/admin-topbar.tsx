import { SidebarTrigger } from "@/components/ui/sidebar";

import { AdminPageTitle } from "./admin-page-title";
import { AdminUserMenu } from "./admin-user-menu";
import { NotificationsButton } from "./notifications-button";
import { ThemeToggle } from "./theme-toggle";

export type AdminTopbarProps = {
  /** Omitted only in the unreachable case where the shell renders without a session. */
  user?: { name: string; email: string; role: string };
  /** `id` of the sign-out <form>, which the shell layout renders. */
  signOutFormId: string;
};

/**
 * A Server Component: it holds no state of its own and only composes the client
 * controls. The sign-out <form> deliberately lives in the layout, so this file
 * never imports a Server Action.
 */
export function AdminTopbar({ user, signOutFormId }: AdminTopbarProps) {
  return (
    /**
     * Sticky, because on a phone the trigger in here is the ONLY way to reach
     * navigation and it used to scroll away on every long list.
     *
     * The translucent background is a plain alpha fill with the blur behind a
     * `supports-` query, so a browser without `backdrop-filter` still gets an
     * opaque-enough bar rather than text over text.
     *
     * Note for anyone adding an overlay in here later: `backdrop-filter` makes
     * this element a containing block for `position: fixed` descendants as well
     * as absolute ones, so a `fixed inset-0` child would resolve against the
     * 4rem bar and collapse. That is rule 68's trap, and it is why nothing in
     * this header is `fixed`.
     */
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-1 border-b border-border bg-background/90 px-3 supports-backdrop-filter:bg-background/70 supports-backdrop-filter:backdrop-blur sm:px-4 lg:px-6">
      <SidebarTrigger className="size-11 shrink-0" />
      <AdminPageTitle className="min-w-0 flex-1 truncate font-display text-title-sm font-bold" />

      <div className="flex shrink-0 items-center gap-1">
        <NotificationsButton />
        <ThemeToggle />
        {user ? (
          <AdminUserMenu
            name={user.name}
            email={user.email}
            role={user.role}
            signOutFormId={signOutFormId}
          />
        ) : null}
      </div>
    </header>
  );
}
