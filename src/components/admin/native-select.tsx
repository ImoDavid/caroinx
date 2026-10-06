import { cn } from "@/lib/utils";

/**
 * A native <select>, styled to match the shadcn Input.
 *
 * Native rather than the Radix Select on purpose: it submits with the form
 * without JavaScript, needs no RHF Controller wrapper, and gets the platform's
 * own picker on touch devices.
 *
 * It exists as a component because the same class string was previously copied
 * into four call sites — which is exactly how the dark-mode bug below survived in
 * three of them.
 *
 * `bg-background` rather than `bg-transparent` is load-bearing. Chrome paints the
 * open option list using the control's own background-color, and `transparent`
 * resolves to white there regardless of `color-scheme: dark` — so a dark-mode
 * dropdown opened onto a white sheet. globals.css pins the <option> colours for
 * the same reason.
 */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base text-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        "md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}
