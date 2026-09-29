import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
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
    <html lang="en" className={`${plusJakarta.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface text-body-base text-on-surface">
        {children}
      </body>
    </html>
  );
}
