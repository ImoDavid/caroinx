"use client";

import { Lock, Unlock } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ChatStatus } from "@/validations/chat";

import type { ConversationFormState } from "@/app/admin/(dashboard)/inbox/form-state";

/**
 * Close or reopen, whichever the current status allows.
 *
 * One component rather than two buttons: the available transition is a function
 * of the status, so rendering both and disabling one would invite a stale page
 * posting the wrong action. The service's filter (`status: "open"` /
 * `status: "closed"`) refuses it either way and the action reports it.
 *
 * Closing stops the visitor writing but does NOT stop the admin replying — the
 * last word is still available, and reopening is a separate deliberate act.
 */

export type ConversationStatusFormProps = {
  closeAction: (state: ConversationFormState, formData: FormData) => Promise<ConversationFormState>;
  reopenAction: (
    state: ConversationFormState,
    formData: FormData,
  ) => Promise<ConversationFormState>;
  conversationId: string;
  status: ChatStatus;
};

export function ConversationStatusForm({
  closeAction,
  reopenAction,
  conversationId,
  status,
}: ConversationStatusFormProps) {
  const open = status === "open";
  const [state, formAction, isPending] = useActionState(
    open ? closeAction : reopenAction,
    undefined,
  );

  return (
    <div className="space-y-space-sm">
      {state?.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="id" value={conversationId} />
        <Button
          type="submit"
          variant="outline"
          size="lg"
          disabled={isPending}
          className="min-h-11 w-full sm:w-auto"
        >
          {open ? (
            <Lock className="size-4" aria-hidden="true" />
          ) : (
            <Unlock className="size-4" aria-hidden="true" />
          )}
          {isPending ? "Saving…" : open ? "Close conversation" : "Reopen conversation"}
        </Button>
      </form>
    </div>
  );
}
