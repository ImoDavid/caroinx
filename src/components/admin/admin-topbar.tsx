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
    <header className="flex h-16 shrink-0 items-center gap-1 border-b border-border px-3 sm:px-4 lg:px-6">
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
