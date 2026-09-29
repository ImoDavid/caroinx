import { BellRing, Satellite, Webhook } from "lucide-react";

import { ArrowLink } from "./arrow-link";
import { IconTile } from "./icon-tile";
import { SectionHeading } from "./section-heading";

const TELEMATICS_STATS: readonly {
  readonly label: string;
  readonly value: string;
  readonly valueClassName: string;
}[] = [
  { label: "Cold Chain Temp", value: "-18.4°C ±0.2°", valueClassName: "text-primary-container" },
  { label: "Security Seal Status", value: "Tamper Sealed", valueClassName: "text-green-700" },
  {
    label: "Port Authority Cleared",
    value: "All 8 Permits",
    valueClassName: "text-primary-container",
  },
];

export function TelemetryHub() {
  return (
    <section
      aria-labelledby="telemetry-heading"
      className="w-full bg-surface py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <SectionHeading
          id="telemetry-heading"
          eyebrow="Real-Time Telemetry & Route Assurance"
          title="Live Manifest & Dynamic Tracking Engine"
          className="pb-space-xl"
          trailing={
            <p className="max-w-md text-body-base text-text-muted">
              Continuous satellite radar integration feeds telemetry straight into your enterprise
              ERP, reducing demurrage and securing chain-of-custody.
            </p>
          }
        />

        <div className="grid grid-cols-1 gap-gutter-desktop lg:grid-cols-12">
          {/* Map display */}
          <div className="flex flex-col justify-between rounded-2xl bg-surface-white p-space-lg shadow-md lg:col-span-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-md">
                <div className="flex items-center gap-space-sm">
                  <span className="size-3 shrink-0 rounded-full bg-green-500 motion-safe:animate-ping" />
                  <span className="font-display text-title-sm font-bold text-primary-container">
                    Vessel Active Vector: CMA CGM MERCURY
                  </span>
                </div>
                <div className="rounded-badge bg-surface-container px-2.5 py-1 text-label-sm font-semibold text-on-surface">
                  Speed: 19.4 knots • Course: 312° NW
                </div>
              </div>

              {/* Decorative backdrop: a stylised Suez transit corridor. */}
              <div
                aria-hidden="true"
                className="relative flex h-64 w-full items-end overflow-hidden rounded-xl bg-[url('/brand/suez-canal-map.svg')] bg-cover bg-center p-space-sm inset-shadow-sm sm:h-80 sm:p-space-md"
              >
                <div className="max-w-sm rounded-xl bg-primary-container/90 p-space-md text-white backdrop-blur-md">
                  <div className="flex items-center gap-2 text-label-badge text-secondary-container uppercase">
                    <Satellite className="size-4" />
                    <span>Direct Inmarsat Ping</span>
                  </div>
                  <div className="pt-1 text-body-sm font-bold text-white">
                    Critical Sector Transit: Gulf of Suez
                  </div>
                  <div className="text-label-sm text-white/70">
                    Next Convoys Passage Window: On Schedule (No Delays Detected)
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-space-sm pt-space-md sm:grid-cols-3">
              {TELEMATICS_STATS.map((stat) => (
                <div key={stat.label} className="rounded-lg bg-surface-container-low p-3">
                  <div className="text-label-sm text-text-muted">{stat.label}</div>
                  <div
                    className={`pt-0.5 font-display text-title-sm font-bold ${stat.valueClassName}`}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Capability pillars */}
          <div className="flex flex-col justify-between space-y-space-md lg:col-span-4">
            <div className="flex flex-1 flex-col justify-between rounded-2xl bg-primary-container p-space-lg text-white shadow-md">
              <div className="space-y-space-sm">
                <IconTile icon={BellRing} variant="onDark" />
                <h3 className="font-display text-title-sm font-bold text-white">
                  Automated Exception Alerts
                </h3>
                <p className="text-body-sm text-white/75">
                  Our telematics algorithm flags route deviations, port berth bottlenecks, and
                  customs holds before they compound into demurrage penalties.
                </p>
              </div>
              <div className="pt-space-md">
                <ArrowLink
                  href="#"
                  arrow="chevron"
                  className="font-display text-title-sm font-semibold text-secondary-container transition-colors hover:text-white"
                >
                  View Full Telematics Specs
                </ArrowLink>
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-between rounded-2xl bg-surface-white p-space-lg text-on-surface shadow-sm">
              <div className="space-y-space-sm">
                <IconTile icon={Webhook} />
                <h3 className="font-display text-title-sm font-bold text-primary-container">
                  EDI &amp; SAP API Integration
                </h3>
                <p className="text-body-sm text-text-muted">
                  Push tracking events, bills of lading, and freight invoices directly to your
                  warehouse management and ERP stack via REST webhook feeds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
