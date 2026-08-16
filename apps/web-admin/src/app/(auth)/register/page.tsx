"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AnimatedNetworkIcon } from "@/components/landing/animated-network-icon";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, null);
  const [hiddenErrorTimestamp, setHiddenErrorTimestamp] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (state?.error && state.timestamp) {
      const timer = setTimeout(() => {
        setHiddenErrorTimestamp(state.timestamp!);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state?.error, state?.timestamp]);

  const errorMsg =
    state?.error && state.timestamp !== hiddenErrorTimestamp
      ? state.error
      : null;

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
            Create an account
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Enter your details below to get started
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
              key={state?.timestamp || "email-input"}
              id="email"
              name="email"
              type="email"
              placeholder="name@mail.com"
              required
              autoComplete="email"
              defaultValue={state?.email as string | undefined}
              className="border border-zinc-200 dark:border-zinc-800"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="password"
              className="text-zinc-950 dark:text-zinc-300 font-medium"
            >
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className="border border-zinc-200 dark:border-zinc-800"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="confirmPassword"
              className="text-zinc-950 dark:text-zinc-300 font-medium"
            >
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="border border-zinc-200 dark:border-zinc-800"
            />
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: -20 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: -20 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <p className="text-[13px] text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-md border border-red-200 dark:border-red-900">
                  {errorMsg}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

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
