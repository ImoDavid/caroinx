"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/validations/auth";

import { loginAction } from "./actions";

/**
 * React Hook Form handles per-field feedback; useActionState owns the server
 * round-trip. The form submits real FormData to the action, so it still works
 * with JavaScript disabled — RHF only decorates it.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);

  const {
    register,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  // A client-side (RHF) message takes precedence; otherwise show the server's.
  const emailError = errors.email?.message ?? state?.fieldErrors?.email;
  const passwordError = errors.password?.message ?? state?.fieldErrors?.password;

  return (
    <form action={formAction} className="space-y-space-md" noValidate>
      {state?.status === "error" && !state.fieldErrors ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="space-y-space-xs">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          autoFocus
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
          className="min-h-11"
          {...register("email")}
        />
        {emailError ? (
          <p id="email-error" className="text-body-sm text-destructive">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="space-y-space-xs">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "password-error" : undefined}
          className="min-h-11"
          {...register("password")}
        />
        {passwordError ? (
          <p id="password-error" className="text-body-sm text-destructive">
            {passwordError}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={isPending} className="min-h-11 w-full">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
