import type { Metadata } from "next";
import { Package } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatReplyForm } from "@/components/admin/chat-reply-form";
import { ChatThreadLive } from "@/components/admin/chat-thread-live";
import { ConversationMeta } from "@/components/admin/conversation-meta";
import { ConversationStatusForm } from "@/components/admin/conversation-status-form";
import { DeleteConversationForm } from "@/components/admin/delete-conversation-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { formatWeight } from "@/lib/format";
import { getConversationForAdmin, pollAdminMessages } from "@/services/chat.service";
import { getShipmentById } from "@/services/shipment.service";
import { TRANSPORT_TYPE_LABELS } from "@/validations/shipment";

import {
  closeConversationAction,
  deleteConversationAction,
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

  const hasImages = thread.messages.some((message) => message.image !== undefined);

  return (
    <div className="space-y-space-lg">
      <div className="space-y-space-sm">
        <Link
          href="/admin/inbox"
          className="inline-flex min-h-11 items-center rounded text-body-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          ← Back to conversations
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <h2 className="font-display text-headline-md break-words">{conversation.visitorName}</h2>
          <div className="flex flex-wrap items-center gap-space-sm">
            {conversation.status === "closed" ? (
              <Badge variant="outline">Closed</Badge>
            ) : (
              <Badge variant="secondary">Open</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Single column on mobile; the sidebar only splits off at lg. No
          master-detail pane at any width — the list is its own page, which is
          what a deep link needs anyway. */}
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="space-y-space-lg lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Server-rendered here so the thread is complete with no
                  JavaScript; from mount on, the client owns the list and the
                  poll keeps it live. See ChatThreadLive for why it ignores
                  later props. */}
              <ChatThreadLive
                conversationId={conversation.id}
                initialMessages={thread.messages}
                initialCursor={thread.cursor}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">
                {conversation.status === "closed" ? "Reply (conversation closed)" : "Reply"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversation.status === "closed" ? (
                <p className="pb-space-sm text-body-sm text-muted-foreground">
                  The visitor can no longer write, but you can still send a final reply. Reopen the
                  conversation to let them respond.
                </p>
              ) : null}
              <ChatReplyForm action={sendAdminReplyAction} conversationId={conversation.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-space-lg">
          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Visitor</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversationMeta conversation={conversation} />
            </CardContent>
          </Card>

          {shipment ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-title-sm">Linked consignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-space-sm">
                <p className="font-mono text-body-sm break-all">{shipment.trackingCode}</p>
                <StatusBadge status={shipment.status} />
                <p className="text-body-sm text-muted-foreground">
                  {TRANSPORT_TYPE_LABELS[shipment.transportType]} ·{" "}
                  {formatWeight(shipment.weightKg)}
                </p>
                <Button asChild variant="outline" size="lg" className="min-h-11 w-full">
                  <Link href={`/admin/cargo/${shipment.id}`}>
                    <Package className="size-4" aria-hidden="true" />
                    Open consignment
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Manage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-space-md">
              <ConversationStatusForm
                closeAction={closeConversationAction}
                reopenAction={reopenConversationAction}
                conversationId={conversation.id}
                status={conversation.status}
              />
              <DeleteConversationForm
                action={deleteConversationAction}
                conversationId={conversation.id}
                visitorName={conversation.visitorName}
                hasImages={hasImages}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
