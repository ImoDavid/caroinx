"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { BrandCta } from "./brand-cta";
import { NAV_LINKS } from "./nav-links";

/**
 * The header's mobile navigation: the toggle AND the panel it opens.
 *
 * Both live in one component so `site-header.tsx` stays a Server Component and
 * the client boundary is exactly the part that needs state — the same scoping
 * discipline `tracking/print-button.tsx` applies. Splitting them would mean a
 * context provider, or making the whole header client.
 *
 * It is a DISCLOSURE, not a dialog: `aria-expanded`/`aria-controls` on the
 * toggle and a plain `<nav>` for the panel, with no `role="dialog"`, no
 * `aria-modal` and no focus trap. The panel is rendered immediately after its
 * own button in DOM order and the desktop nav is `display: none` below `lg`, so
 * Tab flows from the toggle straight into the links with no phantom stops and
 * nothing to trap. That also avoids needing `ui/dialog.tsx`, which is
 * deliberately absent.
 *
 * Note this is NOT a cleaner version of the chat panel's compromise (gap 24) —
 * it is a different one. The backdrop below means pointer users cannot reach the
 * page behind while keyboard and screen-reader users can, so the panel behaves
 * modally for some people without declaring it. Recorded as a gap rather than
 * papered over.
 */

const ROW =
  "flex min-h-11 items-center px-margin py-space-sm text-body-base text-on-surface transition-colors hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-container focus-visible:outline-none";

/**
 * Anchored with `top-full`, NOT `top-header`.
 *
 * The primary bar is `backdrop-blur-md`, and a `backdrop-filter` other than
 * `none` makes an element the containing block for its absolutely AND fixed
 * positioned descendants (Filter Effects L2, same as `filter`/`transform`). So
 * `fixed inset-x-0 top-header` here would resolve against the 80px bar instead
 * of the viewport — the panel would hang 40px below the header and a
 * `fixed inset-0` backdrop would compute a negative height and vanish, taking
 * click-to-close with it, silently.
 *
 * `top-full` is also better than the token would have been: it is the bar's own
 * bottom edge, so it tracks `h-20` if that ever changes, and it accounts for the
 * two `border-b` hairlines that `--spacing-header` (7.5rem) rounds away.
 *
 * No `z-index` on either element, deliberately. `<header>` is `fixed … z-50`,
 * which makes it a stacking context, so the whole subtree paints as one unit at
 * 50 and a `z-index` in here could not be ordered against the chat launcher's
 * `z-40` or the skip link's `focus:z-[60]` even if it wanted to. The only
 * ordering that matters is backdrop-under-panel, which DOM order already gives.
 *
 * `data-print` is absent for the same reason: `<header>` carries
 * `data-print="hide"` and `display: none !important` inherits by cascade.
 */
const OVERLAY = "absolute inset-x-0 top-full lg:hidden";

/** A safety net for short landscape viewports, not the usual case — the panel's
    content is ~290px and the shortest phone leaves ~450px. `dvh`, never `vh`. */
const PANEL_MAX_HEIGHT = "max-h-[calc(100dvh-var(--spacing-header))]";

export function MobileNav() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement | null>(null);

  /**
   * Escape and the backdrop return focus to the toggle, so focus is never lost
   * to the document body. A tapped LINK deliberately does not — the page is
   * navigating out from under it.
   */
  const dismiss = useCallback(() => {
    setOpen(false);
    toggle.current?.focus();
  }, []);

  // Same keyboard contract as chat-launcher.tsx. Setting state from a listener
  // registered by an effect is an event handler, not an effect body, so this is
  // not a react-hooks/set-state-in-effect violation.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dismiss]);

  return (
    <>
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((current) => !current)}
        className="flex size-11 items-center justify-center rounded-lg text-on-surface transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none lg:hidden"
      >
        {open ? (
          <X className="size-6" aria-hidden="true" />
        ) : (
          <Menu className="size-6" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <>
          {/* aria-hidden: Escape, the toggle and every row already close the
              panel, so this adds no keyboard affordance and should not be
              announced. A div rather than a button for that reason — a
              focusable aria-hidden element is itself a violation. */}
          <div
            aria-hidden="true"
            onClick={dismiss}
            className={`${OVERLAY} h-[calc(100dvh-var(--spacing-header))] bg-brand-black/40 backdrop-blur-sm motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in`}
          />

          <nav
            id={panelId}
            // "Mobile", not "Main": jsdom applies no CSS, so the desktop nav's
            // `hidden lg:flex` does not hide it from a component test and two
            // landmarks named "Main" would make getByRole ambiguous.
            aria-label="Mobile"
            className={`${OVERLAY} ${PANEL_MAX_HEIGHT} overflow-y-auto overscroll-contain rounded-b-2xl border-b border-border-subtle bg-surface-white shadow-[0_12px_24px_rgba(0,0,0,0.12)] motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in motion-safe:slide-in-from-top-2`}
          >
            <ul className="flex flex-col py-space-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  {/* next/link only for destinations that exist — a Link on a
                      "#" href would attach prefetch machinery to a no-op route,
                      the same reasoning site-footer.tsx and brand-cta.tsx give. */}
                  {link.href.startsWith("/") ? (
                    <Link className={ROW} href={link.href} onClick={() => setOpen(false)}>
                      {link.label}
                    </Link>
                  ) : (
                    <a className={ROW} href={link.href} onClick={() => setOpen(false)}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>

            {/* The panel's one CTA is the tracking lookup, not Request Quote:
                `/track` is a destination that actually exists, and tracking is
                what someone opens this menu on a phone to do.

                Still a plain <a> rather than next/link, matching the four
                existing BrandCta call sites that already point at a real route
                (contact/page.tsx, pre-footer-cta.tsx, about-hero.tsx ×2).

                It deliberately repeats the `Tracking` row above it: the row list
                mirrors the desktop nav exactly, and this promotes the primary
                action — the same way the header pairs its own nav with a
                Quick Track button. */}
            <div className="border-t border-border-subtle px-margin py-space-md">
              <BrandCta size="lg" href="/track" className="w-full" onClick={() => setOpen(false)}>
                <Search className="size-[18px] shrink-0" aria-hidden="true" />
                Track code
              </BrandCta>
            </div>
          </nav>
        </>
      ) : null}
    </>
  );
}
