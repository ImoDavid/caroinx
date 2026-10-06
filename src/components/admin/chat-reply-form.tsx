"use client";

import { SendHorizontal } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { ChatImageField } from "@/components/admin/chat-image-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGE_MAX_CHARS } from "@/validations/chat";

import type { ReplyFormState } from "@/app/admin/(dashboard)/inbox/form-state";

/**
 * The admin's reply.
 *
 * A real `<form>` posting a Server Action, so it works with JavaScript off —
 * which is why `encType="multipart/form-data"` is mandatory (rule 28): React
 * encodes Server Action submissions itself, so omitting it is invisible while
 * scripting is on, and a native POST then sends only the file's NAME, silently
 * sending a reply with no image.
 */

export type ChatReplyFormProps = {
  action: (state: ReplyFormState, formData: FormData) => Promise<ReplyFormState>;
  conversationId: string;
  disabled?: boolean;
};

export function ChatReplyForm({ action, conversationId, disabled }: ChatReplyFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const form = useRef<HTMLFormElement | null>(null);
  const wasPending = useRef(false);

  /**
   * Clears the fields only after a submission that actually SUCCEEDED.
   *
   * The action returns `undefined` on success and revalidates, which resets
   * `state` but not the DOM's own values — the textarea and file input are
   * uncontrolled, so a sent reply would otherwise stay in the box. Resetting in
   * `onSubmit` instead would be wrong: that fires before the action resolves, so
   * a validation error would silently discard what the admin typed.
   *
   * The `wasPending` edge is what distinguishes "finished with no error" from
   * the initial render, where `state` is also `undefined`.
   */
  useEffect(() => {
    if (wasPending.current && !isPending && state === undefined) form.current?.reset();
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form
      ref={form}
      action={formAction}
      // Mandatory. See the note above — without it the no-JS path loses the file.
      encType="multipart/form-data"
      className="space-y-space-sm"
    >
      <input type="hidden" name="id" value={conversationId} />

      {state?.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-space-xs">
        <Label htmlFor="reply-body">Reply</Label>
        <Textarea
          id="reply-body"
          name="body"
          rows={3}
          maxLength={MESSAGE_MAX_CHARS}
          disabled={disabled || isPending}
          placeholder="Type your reply to the visitor"
          aria-invalid={Boolean(state?.fieldErrors?.body)}
        />
        {state?.fieldErrors?.body ? (
          <p className="text-label-sm text-destructive">{state.fieldErrors.body}</p>
        ) : null}
      </div>

      <ChatImageField
        name="image"
        disabled={disabled || isPending}
        error={state?.fieldErrors?.image}
      />

      <Button
        type="submit"
        size="lg"
        disabled={disabled || isPending}
        className="min-h-11 w-full sm:w-auto"
      >
        <SendHorizontal className="size-4" aria-hidden="true" />
        {isPending ? "Sending…" : "Send reply"}
      </Button>
    </form>
  );
}
