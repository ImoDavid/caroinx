import { ArrowRight, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type ArrowLinkProps = {
  children: React.ReactNode;
  /** `chevron` is used by the on-dark telematics card; everything else uses `arrow`. */
  arrow?: "arrow" | "chevron";
  className?: string;
} & Omit<React.ComponentProps<"a">, "children" | "className">;

export function ArrowLink({ children, arrow = "arrow", className, ...props }: ArrowLinkProps) {
  const Icon = arrow === "chevron" ? ChevronRight : ArrowRight;

  return (
    <a
      className={cn(
        "inline-flex items-center gap-1 rounded-sm focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:outline-hidden",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <Icon className={arrow === "chevron" ? "size-[18px]" : "size-4"} />
    </a>
  );
}
