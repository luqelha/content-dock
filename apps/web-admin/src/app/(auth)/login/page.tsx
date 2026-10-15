"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AtlasMark } from "@/components/atlas-mark";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthFeedback, AuthFieldError } from "@/components/auth-feedback";

function RegistrationNotice() {
  const params = useSearchParams();
  if (params.get("registered") !== "true") return null;
  return (
    <p
      role="status"
      className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
    >
      Registration request received. Try signing in with your credentials. If
      you already have an account, use your existing password.
    </p>
  );
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

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
            Welcome back
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Log in to your account to continue
          </p>
        </div>
        <Suspense fallback={null}>
          <RegistrationNotice />
        </Suspense>
        <form
          action={formAction}
          aria-busy={isPending}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2.5 ">
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
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-zinc-950 dark:text-zinc-300 font-medium"
              >
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              key={state?.timestamp || "password-input"}
              id="password"
              name="password"
              required
              autoComplete="current-password"
              maxLength={1024}
              readOnly={isPending}
              aria-invalid={!!state?.fieldErrors.password}
              aria-describedby={
                state?.fieldErrors.password ? "password-error" : undefined
              }
              className="border border-zinc-200 dark:border-zinc-800"
            />
            <AuthFieldError
              id="password-error"
              message={state?.fieldErrors.password}
            />
          </div>

          <AuthFeedback state={state} />

          <Button type="submit" disabled={isPending} className="mt-2 w-full">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-8">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-zinc-950 dark:text-white hover:underline underline-offset-4 transition-all"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
