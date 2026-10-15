"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AtlasMark } from "@/components/atlas-mark";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthFeedback, AuthFieldError } from "@/components/auth-feedback";
import { PASSWORD_HINT } from "@/lib/auth-validation";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, null);

  return (
    <div className="flex flex-col w-full">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm aspect-square flex flex-col justify-center w-full">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex items-center gap-2 z-10 mb-6 group">
            <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
              <AtlasMark />
            </div>
            <span className="font-semibold text-xl tracking-tight text-zinc-950 dark:text-white">
              Atlas
            </span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
            Create an account
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Enter your details below to get started
          </p>
        </div>
        <form
          action={formAction}
          aria-busy={isPending}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="email"
              className="text-zinc-950 dark:text-zinc-300 font-medium"
            >
              Email address
            </Label>
            <Input
              key={state?.timestamp || "email-input"}
              id="email"
              name="email"
              type="email"
              placeholder="name@mail.com"
              required
              autoComplete="email"
              maxLength={254}
              autoCapitalize="none"
              spellCheck={false}
              readOnly={isPending}
              aria-invalid={!!state?.fieldErrors.email}
              aria-describedby={
                state?.fieldErrors.email ? "email-error" : undefined
              }
              defaultValue={state?.email}
              className="border border-zinc-200 dark:border-zinc-800"
            />
            <AuthFieldError
              id="email-error"
              message={state?.fieldErrors.email}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="password"
              className="text-zinc-950 dark:text-zinc-300 font-medium"
            >
              Password
            </Label>
            <PasswordInput
              key={state?.timestamp || "password-input"}
              id="password"
              name="password"
              required
              autoComplete="new-password"
              minLength={15}
              maxLength={72}
              readOnly={isPending}
              aria-invalid={!!state?.fieldErrors.password}
              aria-describedby={
                state?.fieldErrors.password
                  ? "password-hint password-error"
                  : "password-hint"
              }
              className="border border-zinc-200 dark:border-zinc-800"
            />
            <p
              id="password-hint"
              className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400"
            >
              {PASSWORD_HINT}
            </p>
            <AuthFieldError
              id="password-error"
              message={state?.fieldErrors.password}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="confirmPassword"
              className="text-zinc-950 dark:text-zinc-300 font-medium"
            >
              Confirm password
            </Label>
            <PasswordInput
              key={state?.timestamp || "confirm-password-input"}
              id="confirmPassword"
              name="confirmPassword"
              required
              autoComplete="new-password"
              visibilityLabel="confirmation password"
              maxLength={72}
              readOnly={isPending}
              aria-invalid={!!state?.fieldErrors.confirmPassword}
              aria-describedby={
                state?.fieldErrors.confirmPassword
                  ? "confirm-password-error"
                  : undefined
              }
              className="border border-zinc-200 dark:border-zinc-800"
            />
            <AuthFieldError
              id="confirm-password-error"
              message={state?.fieldErrors.confirmPassword}
            />
          </div>

          <AuthFeedback state={state} />

          <Button type="submit" disabled={isPending} className="mt-2 w-full">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-8">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-950 dark:text-white hover:underline underline-offset-4 transition-all"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
