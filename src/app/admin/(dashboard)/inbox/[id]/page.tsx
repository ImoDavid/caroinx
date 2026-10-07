import type { Metadata } from "next";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatReplyForm } from "@/components/admin/chat-reply-form";
import { ChatThreadLive } from "@/components/admin/chat-thread-live";
import { ConversationDetailsSheet } from "@/components/admin/conversation-details-sheet";
import { ConversationMeta } from "@/components/admin/conversation-meta";
import { ConversationStatusForm } from "@/components/admin/conversation-status-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { formatWeight } from "@/lib/format";
import { getConversationForAdmin, pollAdminMessages } from "@/services/chat.service";
import { getShipmentById } from "@/services/shipment.service";
import type { ConversationDetail } from "@/types/chat";
import type { ShipmentDetail } from "@/types/shipment";
import { TRANSPORT_TYPE_LABELS } from "@/validations/shipment";

import {
  closeConversationAction,
  reopenConversationAction,
  sendAdminReplyAction,
} from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/admin/inbox/[id]">): Promise<Metadata> {
  const { id } = await params;
  const conversation = await getConversationForAdmin(id);
  return { title: conversation ? conversation.visitorName : "Conversation" };
}

function LinkedConsignment({ shipment }: { shipment: ShipmentDetail }) {
  return (
    <div className="space-y-space-sm">
      <p className="font-mono text-body-sm break-all">{shipment.trackingCode}</p>
      <StatusBadge status={shipment.status} />
      <p className="text-body-sm text-muted-foreground">
        {TRANSPORT_TYPE_LABELS[shipment.transportType]} · {formatWeight(shipment.weightKg)}
      </p>
      <Button asChild variant="outline" size="lg" className="min-h-11 w-full">
        <Link href={`/admin/cargo/${shipment.id}`}>
          <Package className="size-4" aria-hidden="true" />
          Open consignment
        </Link>
      </Button>
    </div>
  );
}

/** The details panel. Rendered into the desktop column AND the mobile sheet, so
 *  there is one implementation rather than a copy that drifts. */
function DetailsPanel({
  conversation,
  shipment,
}: {
  conversation: ConversationDetail;
  shipment: ShipmentDetail | null;
}) {
  return (
    <div className="space-y-space-lg">
      <ConversationMeta conversation={conversation} />
      {shipment ? (
        <div className="space-y-space-sm border-t border-border pt-space-md">
          <h3 className="font-display text-title-sm font-bold">Linked consignment</h3>
          <LinkedConsignment shipment={shipment} />
        </div>
      ) : null}
    </div>
  );
}

export default async function ConversationPage({ params }: PageProps<"/admin/inbox/[id]">) {
  // The security boundary for this page.
  await requireAdmin();

  const { id } = await params;
  const conversation = await getConversationForAdmin(id);
  // Covers both a malformed ObjectId and a deleted record: the service returns
  // null for either rather than throwing.
  if (!conversation) notFound();

  // Opening the thread is what marks it read and records admin presence, both
  // folded into this one call. From `after: 0`, so the whole thread comes back.
  const thread = await pollAdminMessages(id, 0);
  if (!thread) notFound();

  // One extra indexed _id read, only when a code actually resolved. This is the
  // product value: the consignment sits beside the conversation about it.
  const shipment = conversation.shipmentId ? await getShipmentById(conversation.shipmentId) : null;

  const closed = conversation.status === "closed";

  const statusControl = (
    <ConversationStatusForm
      closeAction={closeConversationAction}
      reopenAction={reopenConversationAction}
      conversationId={conversation.id}
      status={conversation.status}
    />
  );

  return (
    /**
     * A messaging screen, not a stack of cards: header / thread / composer, with
     * the thread as the only scrolling region so the controls never leave the
     * viewport however long the conversation runs.
     *
     * The height is explicit because the admin shell is `min-h-svh` and so
     * bounds nothing — see `--admin-chrome` in globals.css for the arithmetic.
     * Every scrolling child carries `min-h-0`: a flex child defaults to
     * `min-height: auto`, and without it `overflow-y-auto` never engages and
     * the pane grows instead of scrolling (the trap rule 58 records).
     */
    <div className="flex h-[calc(100dvh-var(--admin-chrome))] min-h-0 flex-col gap-gutter lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <header className="flex shrink-0 flex-wrap items-center gap-space-sm border-b border-border p-space-sm sm:p-space-md">
          <Button asChild variant="ghost" size="icon" className="size-11 shrink-0">
            <Link href="/admin/inbox">
              <ArrowLeft className="size-5" aria-hidden="true" />
              <span className="sr-only">Back to conversations</span>
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            {/* The topbar owns the <h1>, so this is an <h2>. */}
            <h2 className="truncate font-display text-title-sm font-bold">
              {conversation.visitorName}
            </h2>
            <p className="text-label-sm text-muted-foreground">
              {conversation.messageCount} message{conversation.messageCount === 1 ? "" : "s"}
              {conversation.trackingCode ? ` · ${conversation.trackingCode}` : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-space-xs">
            <Badge variant={closed ? "outline" : "secondary"}>{closed ? "Closed" : "Open"}</Badge>

            {/* Details and the close control live in the header on mobile and
                tablet, where there is no sidebar column — this is what makes
                them reachable without scrolling the whole thread. */}
            <span className="lg:hidden">
              <ConversationDetailsSheet visitorName={conversation.visitorName}>
                <DetailsPanel conversation={conversation} shipment={shipment} />
              </ConversationDetailsSheet>
            </span>
          </div>
        </header>

        {/* The one scrolling region. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-space-sm sm:p-space-md">
          {/* Server-rendered here so the thread is complete with no JavaScript;
              from mount on, the client owns the list and the poll keeps it
              live. See ChatThreadLive for why it ignores later props. */}
          <ChatThreadLive
            conversationId={conversation.id}
            initialMessages={thread.messages}
            initialCursor={thread.cursor}
          />
        </div>

        <div className="shrink-0 border-t border-border p-space-sm sm:p-space-md">
          {closed ? (
            <p className="pb-space-sm text-body-sm text-muted-foreground">
              Closed — the visitor can no longer write, but you can still send a final reply.
            </p>
          ) : null}
          <ChatReplyForm action={sendAdminReplyAction} conversationId={conversation.id} />
          <div className="pt-space-sm lg:hidden">{statusControl}</div>
        </div>
      </div>

      {/* Desktop keeps the side column: there is room for it, and a sheet would
          be a worse answer at a width that can show both at once. It scrolls
          independently of the thread. */}
      <aside className="hidden min-h-0 w-80 shrink-0 overflow-y-auto lg:block">
        <div className="space-y-gutter">
          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Visitor</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailsPanel conversation={conversation} shipment={shipment} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Manage</CardTitle>
            </CardHeader>
            <CardContent>{statusControl}</CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
