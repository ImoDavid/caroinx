import { Headset, type LucideIcon, Mail, PackageCheck, Radar } from "lucide-react";

import { BRAND } from "@/components/marketing/brand";
import { IconTile } from "@/components/marketing/icon-tile";
import { SectionHeading } from "@/components/marketing/section-heading";

/**
 * The three desks.
 *
 * Three cards over two mailboxes is the honest arrangement: the subject line is
 * what routes a message, so inventing a third address to make the grid tidy
 * would create a mailbox nobody reads.
 */

type Channel = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly email: string;
  /** Plain text. Encoded at the use site — see the note on the link below. */
  readonly subject: string;
  readonly body: string;
};

const CHANNELS: readonly Channel[] = [
  {
    icon: Radar,
    title: "Live consignments",
    email: BRAND.dispatchEmail,
    subject: "Dispatch enquiry",
    body: "Something is already moving: a delay, a hold at customs, a change of delivery address, or settling a clearance charge. Quote your tracking code.",
  },
  {
    icon: PackageCheck,
    title: "New freight & quotes",
    email: BRAND.supportEmail,
    subject: "Freight quote request",
    body: "You have cargo to move and want a route and a price. Tell us what it is, where it goes, roughly how heavy, and when it needs to land.",
  },
  {
    icon: Headset,
    title: "Tracking & general help",
    email: BRAND.supportEmail,
    subject: "Tracking help",
    body: "A code will not resolve, a status does not make sense, or you are not sure which desk you need. Start here and we will route it.",
  },
];

/**
 * `encodeURIComponent`, never `URLSearchParams`: the latter encodes a space as
 * `+`, and in a mailto query a `+` is a literal plus — the subject would arrive
 * reading "Dispatch+enquiry". A test asserts this.
 */
function mailtoHref(channel: Channel): string {
  return `mailto:${channel.email}?subject=${encodeURIComponent(channel.subject)}`;
}

function ChannelCard({ channel }: { channel: Channel }) {
  return (
    <li className="flex flex-col rounded-2xl bg-surface p-space-md shadow-md sm:p-space-lg">
      <IconTile icon={channel.icon} />
      <h3 className="pt-space-md font-display text-title-sm font-bold text-primary-container">
        {channel.title}
      </h3>
      <p className="grow pt-space-xs text-body-base text-text-muted">{channel.body}</p>

      {/* The visible text is the address itself: someone on a machine with no
          mail handler must still be able to read and copy it. break-all because
          a 29-character address does not fit a 320px card. */}
      <a
        href={mailtoHref(channel)}
        className="mt-space-md inline-flex min-h-11 items-center gap-space-xs rounded-sm font-medium break-all text-primary-container underline underline-offset-4 transition-colors hover:text-primary-light focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:outline-hidden"
      >
        <Mail aria-hidden="true" className="size-4 shrink-0" />
        <span>{channel.email}</span>
      </a>
    </li>
  );
}

export function ContactChannels() {
  return (
    <section
      aria-labelledby="channels-heading"
      className="w-full bg-surface-white py-space-2xl sm:py-space-section lg:py-space-section-desktop"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <SectionHeading
          id="channels-heading"
          eyebrow="Where to Write"
          title="Three Desks, One Inbox Each"
          className="pb-space-2xl"
          trailing={
            <p className="max-w-md text-body-base text-text-muted">
              Each link opens your own mail client with the address and subject already filled in.
            </p>
          }
        />

        {/* A <ul> of <h3>-headed cards rather than a <dl>: these are headed
            sections, not term/value pairs, and the heading outline is what makes
            the page navigable. The <dl> in the next section is a real one. */}
        <ul className="grid grid-cols-1 gap-gutter-desktop md:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((channel) => (
            <ChannelCard key={channel.title} channel={channel} />
          ))}
        </ul>
      </div>
    </section>
  );
}
