import { PackageSearch, SearchX, TriangleAlert } from "lucide-react";

import { ChatCta } from "@/components/marketing/chat/chat-cta";
import { TRACKING_CODE_PREFIX } from "@/validations/shipment";

/**
 * The three non-result states of `/track`, kept in one file because they share
 * a shell and differ only by copy — three near-identical files would be the
 * duplication, not this.
 */

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof SearchX;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-space-lg rounded-2xl bg-surface-white p-space-lg text-center shadow-md sm:p-space-xl">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-container">
        <Icon className="size-6 text-primary-container" aria-hidden="true" />
      </span>
      <h2 className="pt-space-md font-display text-headline-md-mobile text-on-surface sm:text-headline-md">
        {title}
      </h2>
      <div className="mx-auto max-w-prose pt-space-sm text-body-base text-on-surface-variant">
        {children}
      </div>
    </section>
  );
}

/**
 * `code` is whatever the visitor typed, including a malformed one — it is
 * carried into the pre-chat form verbatim so the admin can see what they meant
 * (rule 41 keeps `trackingCodeAttempted` for exactly this).
 */
function SupportLine({ code }: { code?: string }) {
  return (
    <p className="pt-space-sm text-body-sm text-text-muted">
      Still stuck? <ChatCta trackingCode={code}>Chat with our team</ChatCta>.
    </p>
  );
}

export function TrackingEmpty() {
  return (
    <Panel icon={PackageSearch} title="Enter a tracking code to begin">
      <p>
        Your code is printed on the consignment receipt and on the parcel label. It starts with{" "}
        <span className="font-mono font-semibold">{TRACKING_CODE_PREFIX}-</span> and is followed by
        eight characters, like <span className="font-mono font-semibold">TGR-8F3K2QD7</span>.
      </p>
      <p className="pt-space-sm">
        Codes never contain the letters I, L, O or U, so a character that looks like one is a 1 or a
        0.
      </p>
    </Panel>
  );
}

export function TrackingNotFound({ code }: { code: string }) {
  return (
    <Panel icon={SearchX} title="No shipment found">
      <p>
        We have no record of <span className="font-mono font-semibold break-all">{code}</span>.
        Check the code against your receipt — it may have been mistyped, or the consignment may not
        have been registered yet.
      </p>
      <SupportLine code={code} />
    </Panel>
  );
}

export function TrackingInvalid({ code }: { code: string }) {
  return (
    <Panel icon={TriangleAlert} title="That is not a valid tracking code">
      <p>
        <span className="font-mono font-semibold break-all">{code}</span> is not in the right
        format. A tracking code looks like{" "}
        <span className="font-mono font-semibold">TGR-8F3K2QD7</span> — the {TRACKING_CODE_PREFIX}{" "}
        prefix followed by eight characters.
      </p>
      <SupportLine code={code} />
    </Panel>
  );
}
