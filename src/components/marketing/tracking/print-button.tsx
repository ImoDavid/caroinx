"use client";

import { Printer } from "lucide-react";

/**
 * The only client component in the public tracking UI.
 *
 * `window.print()` has no server-side or no-JavaScript equivalent, so the scope
 * of the directive is one button — everything else on the page stays on the
 * server. With scripting off the button simply does nothing visible, which is
 * why the browser's own File ▸ Print still produces the same receipt: the print
 * stylesheet in globals.css does the real work.
 *
 * `data-print="hide"` on the button itself: a "Print receipt" control printed on
 * the receipt is nonsense.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      data-print="hide"
      onClick={() => {
        window.print();
      }}
      className="flex min-h-11 items-center justify-center gap-space-xs rounded-xl border border-white/20 bg-white/10 px-space-md text-body-sm font-medium text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-secondary-container focus-visible:outline-none"
    >
      <Printer className="size-[18px] shrink-0" aria-hidden="true" />
      <span>Print receipt</span>
    </button>
  );
}
