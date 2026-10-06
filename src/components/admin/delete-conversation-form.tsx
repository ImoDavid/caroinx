"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type { DeleteConversationFormState } from "@/app/admin/(dashboard)/inbox/form-state";

/**
 * Deletion is permanent (rule 25). The confirmation names the visitor rather
 * than asking a generic "are you sure?", mirroring the shipment dialog naming
 * its tracking code.
 *
 * The dialog also says what is NOT deleted: any images the visitor attached stay
 * in Cloudinary with no referrer (gap 29). Saying so is the difference between a
 * documented trade-off and a surprise.
 */

export type DeleteConversationFormProps = {
  action: (
    state: DeleteConversationFormState,
    formData: FormData,
  ) => Promise<DeleteConversationFormState>;
  conversationId: string;
  visitorName: string;
  hasImages: boolean;
};

export function DeleteConversationForm({
  action,
  conversationId,
  visitorName,
  hasImages,
}: DeleteConversationFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <div className="space-y-space-sm">
      {state?.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="lg" className="min-h-11">
            <Trash2 className="size-4" aria-hidden="true" />
            Delete conversation
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the conversation with {visitorName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the conversation and every message in it. This cannot be
              undone.
              {hasImages
                ? " Images the visitor attached stay in Cloudinary and are not deleted."
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep conversation</AlertDialogCancel>
            {/* The action lives on a form inside the dialog so the confirm
                button is a real submit — deletion is never a bare onClick. */}
            <form action={formAction}>
              <input type="hidden" name="id" value={conversationId} />
              <AlertDialogAction type="submit" disabled={isPending} className="min-h-11 w-full">
                {isPending ? "Deleting…" : "Delete permanently"}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
