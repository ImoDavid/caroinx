import { ScanBarcode, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { TRACKING_CODE_PREFIX } from "@/validations/shipment";

/**
 * The public tracking lookup form.
 *
 * A plain `<form action="/track" method="get">` — no JavaScript, no client
 * boundary, no Server Action. The browser builds `/track?code=…` itself, which
 * is why both the hero console and the tracking page can render this and still
 * work with scripting disabled. A GET form triggers a full page load rather
 * than a soft navigation; that is the point, not a defect to "fix" with a
 * router push.
 */

export const TRACK_CODE_PARAM = "code";

/** Long enough for the real format plus a pasted stray, short enough to stop a
 *  5 KB paste reaching the server. */
const MAX_LENGTH = 40;

export type TrackFormProps = {
  /**
   * REQUIRED. This form renders more than once per page (hero console, page),
   * and without a prefix the duplicate `id`s would leave every `<label for>`
   * pointing at the first input on the page.
   */
  idPrefix: string;
  variant: "console" | "page";
  defaultValue?: string;
};

export function TrackForm({ idPrefix, variant, defaultValue }: TrackFormProps) {
  const inputId = `${idPrefix}-track-code`;

  return (
    <form
      action="/track"
      method="get"
      className={cn(
        "grid grid-cols-1 gap-space-sm",
        variant === "console" ? "pt-space-xs md:grid-cols-12" : "sm:grid-cols-12",
      )}
    >
      <div
        className={cn(
          "relative flex items-center",
          variant === "console" ? "md:col-span-9" : "sm:col-span-8",
        )}
      >
        <label htmlFor={inputId} className="sr-only">
          Tracking code
        </label>
        <ScanBarcode className="absolute left-4 size-[22px] text-text-muted" aria-hidden="true" />
        <input
          id={inputId}
          name={TRACK_CODE_PARAM}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={MAX_LENGTH}
          defaultValue={defaultValue}
          // The placeholder carries the format example; the empty state on
          // /track explains where to find the code.
          placeholder={`Enter your tracking code (e.g. ${TRACKING_CODE_PREFIX}-8F3K2QD7)`}
          className="min-h-11 w-full rounded-xl bg-surface-container-low py-3.5 pr-4 pl-12 text-body-base text-on-surface transition-all placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary-container focus:outline-hidden"
        />
      </div>

      <div className={variant === "console" ? "md:col-span-3" : "sm:col-span-4"}>
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-center gap-space-xs rounded-xl bg-primary-container px-space-md py-3.5 font-display text-title-sm font-bold text-white shadow-md transition-all hover:bg-primary-light active:scale-[0.98] md:h-full"
        >
          <Search className="size-5 text-secondary-container" aria-hidden="true" />
          <span>Track Cargo Now</span>
        </button>
      </div>
    </form>
  );
}
