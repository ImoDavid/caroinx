import { CountryLabel } from "@/components/admin/country-label";
import { formatDateTime } from "@/lib/format";
import type { ConversationDetail } from "@/types/chat";

/**
 * Who the visitor is, and where they were when they started.
 *
 * A Server Component, prop-driven and free of `server-only`, so the `dom` test
 * project can render it.
 *
 * Every absent field reads "Not recorded" rather than being hidden or guessed.
 * That matters more here than anywhere else in the admin: NONE of the
 * `x-vercel-*` headers exist under `next dev`, so locally this card is almost
 * entirely "Not recorded" — and that is the honest answer, not a bug (rule 55).
 *
 * There is no IP row, deliberately: it is never collected.
 */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[8rem_1fr] sm:gap-space-sm">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="text-body-sm break-words">{value}</dd>
    </div>
  );
}

function Absent() {
  return <span className="text-muted-foreground">Not recorded</span>;
}

export function ConversationMeta({ conversation }: { conversation: ConversationDetail }) {
  const { meta } = conversation;

  return (
    <dl className="space-y-space-sm">
      <Row label="Name" value={conversation.visitorName} />

      <Row
        label="Email"
        value={
          conversation.visitorEmail ? (
            // A mailto rather than plain text: with no email transport (gap 2)
            // the admin's own mail client is the only way to reply off-channel.
            <a
              href={`mailto:${conversation.visitorEmail}`}
              className="rounded text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              {conversation.visitorEmail}
            </a>
          ) : (
            <Absent />
          )
        }
      />

      <Row label="Country" value={<CountryLabel code={meta?.country} />} />
      <Row label="City" value={meta?.city ?? <Absent />} />
      <Row label="Region" value={meta?.region ?? <Absent />} />
      <Row label="Time zone" value={meta?.timezone ?? <Absent />} />

      <Row
        label="Started"
        value={
          <time dateTime={conversation.startedAt}>{formatDateTime(conversation.startedAt)}</time>
        }
      />

      <Row
        label="Last seen"
        value={
          conversation.visitorLastSeenAt ? (
            <time dateTime={conversation.visitorLastSeenAt}>
              {formatDateTime(conversation.visitorLastSeenAt)}
            </time>
          ) : (
            <Absent />
          )
        }
      />

      {/* What they typed when it did NOT resolve, so a transposed character is
          visible rather than silently discarded (rule 41). */}
      {conversation.trackingCodeAttempted ? (
        <Row
          label="Code tried"
          value={
            <span className="font-mono">
              {conversation.trackingCodeAttempted}
              <span className="pl-1 font-sans text-muted-foreground">(no match)</span>
            </span>
          }
        />
      ) : null}

      <Row
        label="Referrer"
        value={meta?.referer ? <span className="break-all">{meta.referer}</span> : <Absent />}
      />

      <Row
        label="Browser"
        value={meta?.userAgent ? <span className="break-all">{meta.userAgent}</span> : <Absent />}
      />
    </dl>
  );
}
