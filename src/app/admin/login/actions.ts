"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger";
import { loginSchema, safeNext } from "@/validations/auth";

export type LoginFormState = FormState<"email" | "password">;

/**
 * One message for every credential failure. better-auth already returns a single
 * code for unknown-email, missing-credential-account and wrong-password alike
 * (and hashes on the miss paths to equalise timing), but we substitute our own
 * constant so a future change upstream cannot widen what we disclose.
 */
const CREDENTIALS_REJECTED = "Email or password is incorrect.";

export async function loginAction(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom<"email" | "password">(parsed.error),
    };
  }

  let destination: string;

  try {
    await connectToDatabase();

    // The session cookie is written by the nextCookies() plugin's after-hook,
    // which copies Set-Cookie into next/headers cookies(). That only works
    // because this is a Server Action — cookies cannot be set during render.
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });

    destination = safeNext(parsed.data.next);
  } catch (error) {
    if (isAPIError(error)) {
      // Email is safe to log; it is the account identifier, not a secret.
      logger.warn("admin sign-in rejected", { email: parsed.data.email });
      return { status: "error", message: CREDENTIALS_REJECTED };
    }

    logger.error("admin sign-in failed unexpectedly", { error });
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  // Outside the try: redirect() throws NEXT_REDIRECT, which must not be caught.
  redirect(destination);
}
