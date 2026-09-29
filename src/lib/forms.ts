import type { z } from "zod";

/**
 * The shape every Server Action returns to `useActionState`.
 *
 * `undefined` is the initial state and means "nothing submitted yet", which keeps
 * the first render free of error markup.
 *
 * Client-safe: imports only zod's types.
 */
export type FormState<Field extends string = string> =
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<Field, string>>;
    }
  | undefined;

/**
 * Flattens a Zod error into one message per field — the first issue wins, since
 * the UI shows a single message under each input.
 */
export function fieldErrorsFrom<Field extends string>(
  error: z.ZodError,
): Partial<Record<Field, string>> {
  const result: Partial<Record<Field, string>> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") continue;
    const field = key as Field;
    result[field] ??= issue.message;
  }

  return result;
}
