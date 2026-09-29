import { Lock, type LucideIcon, PlaneTakeoff, Shield, Ship, Truck, Warehouse } from "lucide-react";

import { ArrowLink } from "./arrow-link";
import { IconTile } from "./icon-tile";
import { SectionHeading } from "./section-heading";

type Service = {
  readonly ordinal: string;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly badge: string;
};

const SERVICES: readonly Service[] = [
  {
    ordinal: "01",
    icon: PlaneTakeoff,
    title: "Air Freight Direct & Charter",
    body: "As an endorsed air freight forwarder, we provide priority expedited air cargo, global charter options, and guaranteed next-flight-out routing worldwide.",
    badge: "IATA Endorsed",
  },
  {
    ordinal: "02",
    icon: Ship,
    title: "Sea & Ocean Freight (FCL/LCL)",
    body: "International ocean freight import and export. Full Container Load (FCL), Less-than-Container Load (LCL), breakbulk, and consolidated ocean services from port-to-port and door-to-door.",
    badge: "High-Capacity Maritime",
  },
  {
    ordinal: "03",
    icon: Truck,
    title: "Road & Intermodal Transportation",
    body: "Dependable domestic and transcontinental linehaul, temperature-controlled reefer fleets, specialized lowboy flatbeds, and dedicated heavy-haul road networks.",
    badge: "Cross-Border Linehaul",
  },
  {
    ordinal: "04",
    icon: Lock,
    title: "Diplomatic Bag & Secure Freight",
    body: "Specialized global secure cargo, diplomatic pouches, secure escort courier, biometric chain-of-custody protocols, and immunity-compliant transport for sensitive government assets.",
    badge: "Vienna Convention Sealed",
  },
  {
    ordinal: "05",
    icon: Warehouse,
    title: "Intelligent Warehousing & Distribution",
    body: "Shared and dedicated bonded warehousing solutions supported by real-time WMS telemetry, climate-controlled cold storage, pick-pack fulfillment, and inventory replenishment.",
    badge: "Bonded Hubs",
  },
  {
    ordinal: "06",
    icon: Shield,
    title: "Specialized Packaging & Hazmat Storage",
    body: "Industrial crating, precision electronics ESD protection, certified IMO/ICAO dangerous goods handling, and Lloyd's-backed comprehensive marine & transit cargo insurance.",
    badge: "Full Transit Insured",
  },
];

function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="group flex flex-col justify-between rounded-2xl bg-surface p-space-lg shadow-sm transition-all duration-300 hover:shadow-xl">
      <div>
        <div className="flex items-center justify-between pb-space-md">
          {/* Decorative ordinal: 20% navy on near-white is well below any contrast floor. */}
          <span
            aria-hidden="true"
            className="font-display text-headline-lg font-black text-primary-container/20 transition-colors group-hover:text-secondary-container"
          >
            {service.ordinal}
          </span>
          <IconTile
            icon={service.icon}
            className="transition-all group-hover:bg-primary-container group-hover:text-secondary-container"
          />
        </div>
        <h3 className="font-display text-title-sm font-bold text-primary-container transition-colors group-hover:text-primary-light">
          {service.title}
        </h3>
        <p className="pt-space-xs text-body-base text-text-muted">{service.body}</p>
      </div>
      <div className="flex items-center justify-between pt-space-lg">
        <span className="text-label-badge font-bold text-primary-container uppercase">
          {service.badge}
        </span>
        <ArrowLink
          href="#"
          className="text-body-sm font-semibold text-primary-container transition-transform group-hover:translate-x-1"
        >
          Learn More
        </ArrowLink>
      </div>
    </div>
  );
}

export function ServicesGrid() {
  return (
    <section
      aria-labelledby="services-heading"
      className="w-full bg-surface-white py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <SectionHeading
          id="services-heading"
          eyebrow="What We Deliver"
          title="Comprehensive Logistics Built for Global Commerce"
          className="pb-space-2xl"
          trailing={
            <ArrowLink
              href="#"
              className="gap-space-xs self-start font-display text-title-sm font-bold text-primary-container transition-colors hover:text-primary-light md:self-auto"
            >
              Explore All 6 Core Divisions
            </ArrowLink>
          }
        />

        <div className="grid grid-cols-1 gap-gutter-desktop md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <ServiceCard key={service.ordinal} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
