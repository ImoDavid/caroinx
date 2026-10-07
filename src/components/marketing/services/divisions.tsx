import { IconTile } from "@/components/marketing/icon-tile";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SERVICE_DIVISIONS, type ServiceDivision } from "@/components/marketing/service-divisions";

/**
 * The six divisions at length.
 *
 * Each is an `<article>` carrying `id={slug}` — that id is the whole point of
 * this section. The landing grid's "Learn More" links and the footer's
 * Solutions column both deep-link into it, and `typedRoutes` is off, so a
 * renamed slug would typecheck, build, and quietly land on the page top. A test
 * pins every slug to a rendered id.
 *
 * `scroll-mt-header`: the site header is `fixed`, so an anchor jump would
 * otherwise put the heading underneath it.
 */

function Division({ division }: { division: ServiceDivision }) {
  return (
    <article
      id={division.slug}
      className="flex scroll-mt-header flex-col rounded-2xl bg-surface p-space-md shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-space-lg"
    >
      <div className="flex items-center justify-between pb-space-md">
        {/* Decorative ordinal: 20% navy on near-white is well below any
            contrast floor, so it is hidden rather than read out. */}
        <span
          aria-hidden="true"
          className="font-display text-headline-lg font-black text-primary-container/20"
        >
          {division.ordinal}
        </span>
        <IconTile icon={division.icon} />
      </div>

      <h3 className="font-display text-title-sm font-bold text-balance text-primary-container">
        {division.title}
      </h3>
      <p className="grow pt-space-xs text-body-base text-text-muted">{division.body}</p>

      <p className="pt-space-lg text-label-badge font-bold text-primary-container uppercase">
        {division.badge}
      </p>
    </article>
  );
}

export function Divisions() {
  return (
    <section
      aria-labelledby="divisions-heading"
      className="w-full bg-surface-white py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <SectionHeading
          id="divisions-heading"
          eyebrow="What We Deliver"
          title="Six Divisions, One Point of Contact"
          className="pb-space-2xl"
          trailing={
            <p className="max-w-md text-body-base text-text-muted">
              A consignment can cross several of these on one code. You deal with the same desk
              throughout.
            </p>
          }
        />

        <div className="grid grid-cols-1 gap-gutter-desktop md:grid-cols-2 lg:grid-cols-3">
          {SERVICE_DIVISIONS.map((division) => (
            <Division key={division.slug} division={division} />
          ))}
        </div>
      </div>
    </section>
  );
}
