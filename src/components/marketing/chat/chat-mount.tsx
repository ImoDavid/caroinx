import { Mail } from "lucide-react";

import { BRAND } from "@/components/marketing/brand";

import { ChatLauncher } from "./chat-launcher";

/**
 * What `(public)/layout.tsx` mounts. A Server Component that reads NOTHING.
 *
 * That is the point: one `cookies()` or `headers()` call anywhere in the
 * `(public)` tree would turn `/`, `/about` and `/contact` from statically
 * prerendered into dynamic. So the widget discovers whether it already has a
 * conversation over HTTP instead, and the cookie is set by
 * `POST /api/chat/conversations` — which it has to be anyway, since cookies
 * cannot be set during render (rule 54, gap 4).
 *
 * `data-print="hide"` because site chrome is dropped from paper, like the header,
 * the footer and the tracking page's print button.
 */
export function ChatMount() {
  return (
    <div data-print="hide">
      {/*
        A chat widget is irreducibly JavaScript-only — unlike print-button.tsx,
        where scripting off merely loses a button the browser's own File ▸ Print
        replaces. This is the honest fallback, and it is the same answer
        `/contact` gives for the same reason (no email transport to post a form
        to). `encodeURIComponent`, never URLSearchParams: a `+` in a mailto query
        is a literal plus, so the subject would arrive reading "Support+enquiry".
      */}
      <noscript>
        <a
          href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent("Support enquiry")}`}
          className="fixed right-3 bottom-3 z-40 inline-flex min-h-14 items-center gap-space-xs rounded-full bg-primary-container px-space-lg font-display text-body-sm font-bold text-white shadow-lg"
        >
          <Mail className="size-5 text-secondary-container" aria-hidden="true" />
          Email support
        </a>
      </noscript>

      <ChatLauncher />
    </div>
  );
}
