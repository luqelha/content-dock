"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace, saveWorkspace } from "@/actions/workspace";
import { useTenant } from "@/components/providers/tenant-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function WorkspaceSettings({ create = false }: { create?: boolean }) {
  const { activeTenant } = useTenant();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editable = create || activeTenant?.role === "ADMIN";
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {create ? "Create a workspace" : "Workspace settings"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {create
            ? "Organize content and invite your team in a separate workspace."
            : "Manage your organization's name and workspace identifier."}
        </p>
      </div>
      <form
        key={
          create
            ? "new"
            : `${activeTenant?.id}:${activeTenant?.name}:${activeTenant?.domain}`
        }
        action={(form) =>
          startTransition(async () => {
            setError("");
            setMessage("");
            const result = await (create
              ? createWorkspace(form)
              : saveWorkspace(form));
            if (result.error) setError(result.error);
            else {
              setMessage("Workspace saved.");
              if (create) router.push("/dashboard");
              router.refresh();
            }
          })
        }
        className="rounded-lg border bg-card"
      >
        <div className="border-b p-5">
          <h2 className="text-sm font-semibold">Organization details</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Changes apply to everyone in this workspace.
          </p>
        </div>
        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              name="name"
              required
              maxLength={100}
              defaultValue={create ? "" : activeTenant?.name}
              disabled={!editable || pending}
              placeholder="Acme Operations"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-domain">
              Workspace domain{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="workspace-domain"
              name="domain"
              defaultValue={create ? "" : activeTenant?.domain || ""}
              disabled={!editable || pending}
              placeholder="acme.example.com"
              pattern="[a-z0-9]+([.\-][a-z0-9]+)*"
            />
            <p className="text-xs text-muted-foreground">
              A unique identifier. Domain routing and DNS are configured
              separately.
            </p>
          </div>
          {!create && (
            <dl className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Workspace ID</dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {activeTenant?.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Your role</dt>
                <dd className="mt-1">{activeTenant?.role}</dd>
              </div>
            </dl>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t p-5">
          <p className="text-xs text-muted-foreground">
            {editable
              ? "Only administrators can change these details."
              : "Contact an administrator to make changes."}
          </p>
          <Button type="submit" disabled={!editable || pending}>
            {pending ? "Saving…" : create ? "Create workspace" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
