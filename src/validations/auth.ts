import { z } from "zod";

/** Must match `emailAndPassword.minPasswordLength` in lib/auth/options.ts. */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/**
 * Shared by the client form (via zodResolver) and the Server Action. The
 * server-side parse is the authoritative one; the client use is purely for
 * immediate feedback.
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  // No min-length message that reveals the policy on a *login* form: an attacker
  // learning the minimum length is a small but free gift. Length is still
  // enforced so absurd inputs never reach the hashing code.
  password: z.string().min(1, "Enter your password").max(PASSWORD_MAX),
  /** Post-login destination; validated again by safeNext() before use. */
  next: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Open-redirect guard. Only same-origin admin paths survive; everything else —
 * absolute URLs, protocol-relative `//evil.com`, and any non-admin path —
 * collapses to the dashboard.
 */
export function safeNext(next: string | undefined | null): string {
  if (!next) return "/admin";
  if (next.startsWith("//")) return "/admin";
  if (!/^\/admin(\/|$)/.test(next)) return "/admin";
  // Reject traversal attempts outright rather than trying to normalise them.
  if (next.includes("..")) return "/admin";
  return next;
}
