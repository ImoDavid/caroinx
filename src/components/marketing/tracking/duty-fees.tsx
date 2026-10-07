import { CreditCard, ReceiptText } from "lucide-react";

import { BRAND } from "@/components/marketing/brand";
import { ChatCta } from "@/components/marketing/chat/chat-cta";
import { formatAmount } from "@/lib/format";
import type { PublicShipment } from "@/types/tracking";

/**
 * The customs charge, and the (currently inert) way to settle it.
 *
 * Renders NOTHING when no charge was levied — no "Duty fees: —" row. An em dash
 * would imply every shipment ought to have a charge, which is the same reasoning
 * the admin detail page uses.
 *
 * A charge outlives the hold (CLAUDE.md rule 32 keeps `amount` after release),
 * so once the shipment moves on this becomes a record of what was levied rather
 * than a demand, and the pay affordance goes away with the demand.
 */
export function DutyFees({ shipment }: { shipment: PublicShipment }) {
  const { amount } = shipment;
  if (amount === undefined) return null;

  const payable = shipment.status === "customs_held";

  return (
    <section
      aria-labelledby="duty-fees-heading"
      data-print="block"
      className={
        payable
          ? "rounded-2xl border border-brand-olive/30 bg-secondary-container/20 p-space-md shadow-md sm:p-space-lg"
          : "rounded-2xl bg-surface-white p-space-md shadow-md sm:p-space-lg"
      }
    >
      <h2
        id="duty-fees-heading"
        className="flex items-center gap-space-xs font-display text-title-sm font-bold text-on-surface"
      >
        <ReceiptText className="size-[18px] shrink-0 text-primary-container" aria-hidden="true" />
        {payable ? "Customs clearance fee" : "Customs charge"}
      </h2>

      <p className="pt-space-sm font-display text-headline-md-mobile text-primary-container sm:text-headline-md">
        {formatAmount(amount)}
      </p>

      <p className="pt-space-xs text-body-sm text-on-surface-variant">
        {payable
          ? "This charge must be settled before your consignment can be released from customs."
          : "This charge was levied while the consignment was held at customs."}
      </p>

      {payable ? (
        <>
          {/* NOT `disabled`: that removes the control from the tab order and most
              screen readers skip it entirely, so a customer would get no
              explanation of why they cannot pay. aria-disabled announces the
              state while keeping it focusable and described. */}
          <button
            type="button"
            aria-disabled="true"
            aria-describedby="clearance-unavailable"
            data-print="hide"
            className="mt-space-md flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-space-xs rounded-xl bg-primary-container/60 px-space-md py-3 font-display text-title-sm font-bold text-white shadow-md"
          >
            <CreditCard className="size-5 shrink-0 text-secondary-container" aria-hidden="true" />
            <span>Pay clearance fee · {formatAmount(amount)}</span>
          </button>

          <p
            id="clearance-unavailable"
            data-print="hide"
            className="pt-space-sm text-body-sm text-on-surface-variant"
          >
            Online payment is not available yet. To settle this charge,{" "}
            {/* The tracking code is passed through, so the pre-chat form arrives
                prefilled and the admin sees the consignment beside the thread —
                the visitor no longer has to copy a code off the page they are
                already looking at. */}
            <ChatCta
              trackingCode={shipment.trackingCode}
              fallbackEmail={BRAND.dispatchEmail}
              fallbackSubject={`Customs clearance fee · ${shipment.trackingCode}`}
            >
              chat with our operations desk
            </ChatCta>
            .
          </p>
        </>
      ) : null}
    </section>
  );
}
