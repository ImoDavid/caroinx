import { type LucideIcon, PlaneTakeoff, Shield } from "lucide-react";
import Link from "next/link";

import { BRAND } from "./brand";
import { BrandLogo } from "./brand-logo";

/**
 * `{ label, href }` rather than a bare string because some destinations now
 * exist. `marketing/mobile-nav.tsx` means the Company column below is no longer
 * the ONLY way to reach `/about` and `/contact` under 1024px — but it is still
 * the only one that works with scripting off, since the mobile panel is a client
 * island and has no no-JS equivalent.
 */
type FooterLink = {
  readonly label: string;
  readonly href: string;
};

type FooterColumn = {
  readonly heading: string;
  readonly links: readonly FooterLink[];
};

const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    /**
     * These labels predate `/services` and do not match its six division
     * titles one-for-one, so each is pointed at the division that genuinely
     * covers it rather than renamed to match. Two are not literal matches:
     *   - "Cold Chain Storage" → warehousing, whose copy already names
     *     "climate-controlled cold storage".
     *   - "Customs Brokerage" → the page itself, with NO anchor. None of the
     *     six divisions is customs brokerage, and sending it to the
     *     nearest-sounding one would be a lie. The page top is the honest
     *     destination until something on it actually covers clearance.
     */
    heading: "Solutions",
    links: [
      { label: "Air Cargo Direct", href: "/services#air-freight" },
      { label: "Ocean Freight FCL/LCL", href: "/services#ocean-freight" },
      { label: "Intermodal Road Freight", href: "/services#road-intermodal" },
      { label: "Diplomatic Courier", href: "/services#diplomatic-secure" },
      { label: "Cold Chain Storage", href: "/services#warehousing" },
      { label: "Customs Brokerage", href: "/services" },
    ],
  },
  {
    heading: "Tracking & Tools",
    links: [
      { label: "Live GPS Telematics", href: "#" },
      { label: "Container Milestones", href: "#" },
      { label: "Air Waybill (AWB) Status", href: "#" },
      { label: "Freight Rate Calculator", href: "#" },
      { label: "Vessel & Fleet Schedules", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About True Global", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Global Hub Network", href: "#" },
      { label: "ESG & Compliance", href: "#" },
      { label: "Safety Standards", href: "#" },
      { label: "Enterprise Case Studies", href: "#" },
      { label: "Careers & Leadership", href: "#" },
    ],
  },
];

const FOOTER_CERTS: readonly { readonly icon: LucideIcon; readonly label: string }[] = [
  { icon: Shield, label: "AEO-F CERTIFIED" },
  { icon: PlaneTakeoff, label: "IATA CNS CARRIER" },
];

const FOOTER_LEGAL_LINKS: readonly string[] = [
  "Terms of Carriage",
  "Bill of Lading Terms",
  "Privacy Policy",
  "Port Security Protocols",
];

function FooterColumn({ column }: { column: FooterColumn }) {
  return (
    <div className="space-y-space-sm lg:col-span-2">
      <h2 className="font-display text-title-sm font-bold tracking-wide text-white uppercase">
        {column.heading}
      </h2>
      <ul className="space-y-space-xs text-body-sm text-white/70">
        {column.links.map((link) => (
          <li key={link.label}>
            {/* next/link only for destinations that exist. A Link on a "#" href
                would attach prefetch machinery to a no-op route — the same
                reasoning brand-cta.tsx gives for staying a plain anchor. */}
            {link.href.startsWith("/") ? (
              <Link className="transition-colors hover:text-secondary-container" href={link.href}>
                {link.label}
              </Link>
            ) : (
              <a className="transition-colors hover:text-secondary-container" href={link.href}>
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer
      data-print="hide"
      className="w-full border-t border-border-dark bg-brand-abyss pt-space-2xl pb-space-xl text-white"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-1 gap-gutter-desktop border-b border-border-dark pb-space-2xl md:grid-cols-2 lg:grid-cols-12">
          {/* col-span-6, not 4: the 12-column row was 4 + (3 × 2) + 2, and the
              Global Operations block that held the last 2 is gone. Without this
              the row would stop short and read as a layout bug. */}
          <div className="space-y-space-md lg:col-span-6">
            <BrandLogo />
            <p className="max-w-sm text-body-base text-white/70">
              Premier multimodal freight forwarding, intermodal rail &amp; road, air transit, and
              temperature-controlled global warehousing operating across 160+ countries with
              telematics-backed accountability.
            </p>
            <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
              {FOOTER_CERTS.map((cert) => (
                <div
                  key={cert.label}
                  className="flex items-center gap-space-xs rounded-badge border border-border-dark bg-white/5 px-space-sm py-1 text-label-badge text-white/90"
                >
                  <cert.icon className="size-3.5 text-secondary-container" />
                  <span>{cert.label}</span>
                </div>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <FooterColumn key={column.heading} column={column} />
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-space-md pt-space-lg text-center text-label-sm text-white/60 md:flex-row md:text-left">
          <div>{BRAND.copyright}</div>
          <div className="flex flex-wrap items-center justify-center gap-x-space-md gap-y-space-xs">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <a key={link} className="transition-colors hover:text-white" href="#">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
