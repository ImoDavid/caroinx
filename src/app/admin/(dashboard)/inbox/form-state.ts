import type { FormState } from "@/lib/forms";

/**
 * Field-key unions and `FormState` aliases for the inbox actions.
 *
 * A SEPARATE file from `actions.ts` for the same reason as the cargo module's:
 * `actions.ts` carries the `"use server"` directive, and every export of such a
 * module is treated as a callable server reference. A type exported from there
 * would be registered as an action endpoint.
 */

/**
 * `image` is not a key of `chatSendSchema` — the schema validates metadata, not
 * a `File` — but an attachment still needs somewhere to report an error, exactly
 * as `photo` does in the cargo form state.
 */
export type ReplyField = "body" | "image";
export type ReplyFormState = FormState<ReplyField>;

/** Close and reopen both address a conversation by id and nothing else. */
export type ConversationFormState = FormState<"id">;
