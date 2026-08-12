"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AnimatedNetworkIcon } from "@/components/landing/animated-network-icon";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="flex flex-col w-full">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm aspect-square flex flex-col justify-center w-full">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex items-center gap-2 z-10 mb-6 group">
            <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
              <AnimatedNetworkIcon />
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
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="email"
              className="text-zinc-950 dark:text-zinc-300 font-medium"
            >
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@mail.com"
              required
              autoComplete="email"
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
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {state?.error && (
            <p className="text-[13px] text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-md border border-red-200 dark:border-red-900">
              {state.error}
            </p>
          )}

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
