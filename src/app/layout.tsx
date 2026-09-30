import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

// Both families are variable fonts, so `weight` is omitted deliberately: one
// file per family covers every weight the design uses (600/700/800 for display,
// 400/500/600/700 for body).
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

// `style` must include italic — the testimonial quotes are italic and would
// otherwise be synthesised by the browser.
const inter = Inter({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-inter",
  display: "swap",
});

// Neutral root metadata: each route group supplies its own title. The template
// applies to any nested page that sets only a plain `title`.
export const metadata: Metadata = {
  title: {
    default: "True Global Route Logistics",
    template: "%s · True Global Route Logistics",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning` is required by next-themes, which sets the
    // theme class on <html> from a blocking script before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${inter.variable} h-full antialiased`}
    >
      {/* Semantic tokens rather than the light-only brand ones, so the admin's
          dark background owns the body and overscroll area. The public site
          re-applies its own surface colours in `(public)/layout.tsx`. */}
      <body className="flex min-h-full flex-col bg-background text-body-base text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
