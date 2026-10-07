import { BRAND } from "@/components/marketing/brand";

import { ChatCtaButton } from "./chat-cta-button";

/**
 * "Talk to us" anywhere on the public site — opens the chat widget instead of
 * handing the visitor an email address.
 *
 * A Server Component wrapping the client button, so the `<noscript>` fallback
 * is emitted as real markup (rule 57: React's client renderer puts nothing
 * inside a `<noscript>`).
 *
 * The fallback matters because the chat is irreducibly JavaScript-only
 * (CLAUDE.md gap 23) and these CTAs REPLACED working `mailto:` links. Without
 * it, scripting off would turn each one into a button that silently does
 * nothing. `chat-mount.tsx` already renders a site-wide `<noscript>` email
 * button, but that is a floating affordance elsewhere on the page — it does not
 * answer "settle this charge" where the charge is displayed.
 *
 * `encodeURIComponent`, never URLSearchParams: a `+` in a mailto query is a
 * literal plus, so the subject would arrive reading "Customs+clearance"
 * (gap 19's lesson, and the same note chat-mount.tsx carries).
 */
export function ChatCta({
  children,
  trackingCode,
  className,
  /** Who the `<noscript>` fallback writes to. Defaults to support. */
  fallbackEmail = BRAND.supportEmail,
  fallbackSubject = "Support enquiry",
}: {
  children: React.ReactNode;
  trackingCode?: string;
  className?: string;
  fallbackEmail?: string;
  fallbackSubject?: string;
}) {
  const subject = trackingCode ? `${fallbackSubject} · ${trackingCode}` : fallbackSubject;

  return (
    <>
      <ChatCtaButton trackingCode={trackingCode} className={className}>
        {children}
      </ChatCtaButton>

      <noscript>
        <a
          href={`mailto:${fallbackEmail}?subject=${encodeURIComponent(subject)}`}
          className="rounded font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none"
        >
          {fallbackEmail}
        </a>
      </noscript>
    </>
  );
}
