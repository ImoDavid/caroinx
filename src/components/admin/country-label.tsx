import { COUNTRY_NAMES, flagEmoji, type CountryCode } from "@/lib/countries";

/**
 * Flag then name. The flag is `aria-hidden` — the name already says it, and a
 * screen reader announcing "flag: Nigeria, Nigeria" helps nobody.
 *
 * Handles the absent case because more than one record can legitimately lack a
 * country: shipments created before the field existed, and chat conversations
 * started where no `x-vercel-ip-country` header was present (every one under
 * `next dev`). "Not recorded" is the shared wording for both — never a guess
 * from a locale.
 *
 * Lives here rather than in a page because the cargo detail page and the inbox
 * both render it, and the absent-case wording must not drift between them.
 * Prop-driven and server-safe, so the `dom` test project can render it.
 */
export function CountryLabel({ code }: { code?: CountryCode }) {
  if (!code) return <span className="text-muted-foreground">Not recorded</span>;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true">{flagEmoji(code)}</span>
      {COUNTRY_NAMES[code]}
    </span>
  );
}
