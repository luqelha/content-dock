"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AnimatedNetworkIcon } from "@/components/landing/animated-network-icon";

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    // Simulate API call for password reset
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsPending(false);
    setIsSuccess(true);
  };

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
            Reset password
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Enter your email to receive a reset link
          </p>
        </div>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p className="text-center text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Check your email for the reset link!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

            <Button type="submit" disabled={isPending} className="mt-2 w-full">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isPending ? "Sending link..." : "Send reset link"}
            </Button>
          </form>
        )}
        
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-8">
          Remember your password?{" "}
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
