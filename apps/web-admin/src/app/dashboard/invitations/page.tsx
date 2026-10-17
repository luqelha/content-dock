"use client";
import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { acceptInvitation } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
function Invitation() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const token = params.get("token") || "";
  return (
    <div className="mx-auto max-w-xl p-6">
      <section className="space-y-4 rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Join a workspace</h1>
        <p className="text-sm text-muted-foreground">
          Accept this invitation using the email address your administrator
          invited.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          disabled={!token || pending}
          onClick={() =>
            start(async () => {
              const result = await acceptInvitation(token);
              if (result.error) setError(result.error);
              else {
                router.push("/dashboard");
                router.refresh();
              }
            })
          }
        >
          {pending ? "Joining…" : "Accept invitation"}
        </Button>
      </section>
    </div>
  );
}
export default function InvitationPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading invitation…</p>}>
      <Invitation />
    </Suspense>
  );
}
