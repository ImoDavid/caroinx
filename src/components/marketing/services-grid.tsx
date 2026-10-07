import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { IconTile } from "./icon-tile";
import { SectionHeading } from "./section-heading";
import { SERVICE_DIVISIONS, type ServiceDivision } from "./service-divisions";

/**
 * The landing page's service summary.
 *
 * The list itself lives in `service-divisions.ts` because `/services` renders
 * the same six at length — one table, so the two surfaces cannot disagree about
 * what the company does.
 */

function ServiceCard({ service }: { service: ServiceDivision }) {
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
        {/* `asChild`-less by design: ArrowLink is a plain <a>, so a real
            destination wants next/link's prefetch. The anchor is the division's
            own section on /services. */}
        <Link
          href={`/services#${service.slug}`}
          className="inline-flex items-center gap-1 rounded-sm text-body-sm font-semibold text-primary-container transition-transform group-hover:translate-x-1 focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:outline-hidden"
        >
          <span>Learn More</span>
          <span className="sr-only"> about {service.title}</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
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
            <Link
              href="/services"
              className="inline-flex items-center gap-space-xs self-start rounded-sm font-display text-title-sm font-bold text-primary-container transition-colors hover:text-primary-light focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:outline-hidden md:self-auto"
            >
              <span>Explore All {SERVICE_DIVISIONS.length} Core Divisions</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-gutter-desktop md:grid-cols-2 lg:grid-cols-3">
          {SERVICE_DIVISIONS.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
