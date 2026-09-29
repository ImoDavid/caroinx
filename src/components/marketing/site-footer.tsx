import { type LucideIcon, PlaneTakeoff, Shield } from "lucide-react";

import { BRAND } from "./brand";
import { BrandLogo } from "./brand-logo";

type FooterColumn = {
  readonly heading: string;
  readonly links: readonly string[];
};

const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: "Solutions",
    links: [
      "Air Cargo Direct",
      "Ocean Freight FCL/LCL",
      "Intermodal Road Freight",
      "Diplomatic Courier",
      "Cold Chain Storage",
      "Customs Brokerage",
    ],
  },
  {
    heading: "Tracking & Tools",
    links: [
      "Live GPS Telematics",
      "Container Milestones",
      "Air Waybill (AWB) Status",
      "Freight Rate Calculator",
      "Vessel & Fleet Schedules",
    ],
  },
  {
    heading: "Company",
    links: [
      "About True Global",
      "Global Hub Network",
      "ESG & Compliance",
      "Safety Standards",
      "Enterprise Case Studies",
      "Careers & Leadership",
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
          <li key={link}>
            <a className="transition-colors hover:text-secondary-container" href="#">
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-border-dark bg-brand-abyss pt-space-2xl pb-space-xl text-white">
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-1 gap-gutter-desktop border-b border-border-dark pb-space-2xl md:grid-cols-2 lg:grid-cols-12">
          <div className="space-y-space-md lg:col-span-4">
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

          <div className="space-y-space-sm lg:col-span-2">
            <h2 className="font-display text-title-sm font-bold tracking-wide text-white uppercase">
              Global Operations
            </h2>
            <div className="space-y-space-xs text-body-sm text-white/70">
              <p className="font-medium text-white">Worldwide HQ:</p>
              <p>
                World Trade Center, Ste 4800
                <br />
                Rotterdam &amp; Houston
              </p>
              <p className="pt-2 font-medium text-white">Dispatch Desk:</p>
              <p className="font-semibold break-all text-secondary-container">
                {BRAND.dispatchEmail}
              </p>
            </div>
          </div>
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
