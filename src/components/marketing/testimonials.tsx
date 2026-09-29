import { Quote } from "lucide-react";

type Testimonial = {
  readonly quote: string;
  readonly initials: string;
  readonly name: string;
  readonly role: string;
  readonly avatarClassName: string;
};

const TESTIMONIALS: readonly Testimonial[] = [
  {
    quote:
      "Given our complex global supply chain across multiple continents, the level of precision, communication, and proactive tracking provided by True Global Route Logistics greatly exceeds typical industry standards.",
    initials: "MP",
    name: "Monique Pete",
    role: "Logistics Manager, Martrax Inc.",
    avatarClassName: "bg-primary-container text-white",
  },
  {
    quote:
      "More than once, True Global Route Logistics has saved critical release timelines, executing high-priority freight dispatch on short notice with flawless reliability.",
    initials: "SA",
    name: "Steve Anderson",
    role: "President & Owner, Duplication Factory",
    avatarClassName: "bg-secondary-container text-on-primary-fixed",
  },
  {
    quote:
      "Reliable carrier assignment, transparent demurrage mitigation, and round-the-clock coordination make True Global Route Logistics our primary international transport partner.",
    initials: "CB",
    name: "Cathy Beckman",
    role: "Logistics Lead, Oxea Chemicals",
    avatarClassName: "bg-primary-container text-white",
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex flex-col justify-between rounded-2xl bg-surface p-space-xl shadow-sm transition-shadow hover:shadow-md">
      <div className="space-y-space-md">
        <Quote className="size-10 text-brand-olive" />
        <blockquote className="text-body-base text-on-surface italic">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
      </div>
      <figcaption className="mt-space-md flex items-center gap-space-sm border-t border-border-subtle pt-space-xl">
        <div
          className={`flex size-11 items-center justify-center rounded-full text-title-sm font-bold ${testimonial.avatarClassName}`}
        >
          {testimonial.initials}
        </div>
        <div>
          <div className="font-display text-title-sm font-bold text-primary-container">
            {testimonial.name}
          </div>
          <div className="text-body-sm text-text-muted">{testimonial.role}</div>
        </div>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  return (
    <section
      aria-labelledby="testimonials-heading"
      className="w-full bg-surface-white py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="max-w-2xl pb-space-2xl">
          <span className="text-label-badge font-bold tracking-widest text-brand-olive uppercase">
            Client Stories &amp; Industry Trust
          </span>
          <h2
            id="testimonials-heading"
            className="pt-1 font-display text-headline-lg-mobile text-primary-container sm:text-headline-lg"
          >
            Trusted by Global Supply Chain Directors
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-gutter-desktop md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
