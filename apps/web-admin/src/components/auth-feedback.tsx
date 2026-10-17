"use client";

import { useEffect, useRef } from "react";
import type { AuthState } from "@/lib/auth-validation";

export function AuthFeedback({ state }: { state: AuthState | null }) {
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.error) alertRef.current?.focus();
  }, [state]);

  if (!state?.error) return null;
  return (
    <div
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 outline-offset-2 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
    >
      {state.error}
    </div>
  );
}

export function AuthFieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
