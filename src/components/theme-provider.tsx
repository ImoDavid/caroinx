"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme switching for the admin application.
 *
 * Mounted in the ROOT layout rather than the admin one, because next-themes
 * mutates `document.documentElement` — so `suppressHydrationWarning` has to sit
 * on <html>, which only the root layout renders. It also injects the blocking
 * inline script that sets the class before first paint, which is what prevents a
 * flash of the wrong theme on hard reload.
 *
 * The public marketing site is a light-only design and is unaffected: it paints
 * exclusively with the brand tokens, and `(public)/layout.tsx` additionally
 * carries `.light-only` so a future semantic-token utility there cannot invert.
 *
 * `attribute="class"` matches `@custom-variant dark (&:is(.dark *))` in
 * globals.css. Note that variant matches DESCENDANTS of `.dark`, so a `dark:`
 * utility placed on <html> itself would silently never apply.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
