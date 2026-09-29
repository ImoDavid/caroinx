import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  /** Wired to the section's `aria-labelledby`. */
  id: string;
  eyebrow: string;
  title: string;
  /** Right-hand paragraph or link that sits opposite the heading. */
  trailing?: React.ReactNode;
  className?: string;
};

export function SectionHeading({ id, eyebrow, title, trailing, className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-space-md md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div>
        <span className="font-body text-label-badge font-bold tracking-widest text-brand-olive uppercase">
          {eyebrow}
        </span>
        <h2
          id={id}
          className="pt-1 font-display text-headline-lg-mobile text-primary-container sm:text-headline-lg"
        >
          {title}
        </h2>
      </div>
      {trailing}
    </div>
  );
}
