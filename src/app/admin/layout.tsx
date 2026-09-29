import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  // The admin area must never appear in search results.
  robots: { index: false, follow: false },
};

/**
 * Chrome for the admin area.
 *
 * There is deliberately NO authentication check here. Layouts do not re-render on
 * client-side navigation, do not gate sibling route segments, and do nothing for
 * Server Actions — so a check here would look like security without being it.
 * Each admin page calls `requireAdmin()`, and so does every Server Action.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-surface text-on-surface">{children}</div>
  );
}
