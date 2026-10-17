"use client";
import { Button } from "@/components/ui/button";
export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-xl font-semibold">Unable to load this page</h1>
      <p className="text-sm text-muted-foreground">
        Your workspace data could not be loaded. Check your connection and try
        again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
