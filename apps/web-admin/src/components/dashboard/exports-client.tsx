"use client";
import { useEffect, useState, useTransition } from "react";
import { Download, FileArchive } from "lucide-react";
import { requestExport, exportStatus } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
type Job = {
  id: string;
  status: string;
  progress: number;
  start: string;
  end: string;
};
export function ExportsClient({ initialJobId }: { initialJobId?: string }) {
  const [job, setJob] = useState<Job | null>(() =>
    initialJobId
      ? { id: initialJobId, status: "Pending", progress: 0, start: "", end: "" }
      : null,
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!job || ["Completed", "Failed"].includes(job.status)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await exportStatus(job.id);
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
        setJob((old) => (old ? { ...old, status: "Failed" } : null));
      } else if (result.data) {
        const next = result.data.data;
        setJob((old) =>
          old
            ? {
                ...old,
                status: next.status,
                progress: next.progress,
                start: next.startDate,
                end: next.endDate,
              }
            : null,
        );
        if (next.error) setError(next.error);
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [job]);
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prepare a ZIP archive of your workspace audit records.
        </p>
      </div>
      <form
        className="rounded-lg border bg-card"
        action={(form) =>
          startTransition(async () => {
            setError("");
            const result = await requestExport(form);
            if (result.error) setError(result.error);
            else if (result.data) {
              const url = new URL(window.location.href);
              url.searchParams.set("job", result.data.data.jobId);
              window.history.replaceState(null, "", url.toString());
              setJob({
                id: result.data.data.jobId,
                status: "Pending",
                progress: 0,
                start: String(form.get("startDate")),
                end: String(form.get("endDate")),
              });
            }
          })
        }
      >
        <div className="border-b p-5">
          <h2 className="text-sm font-semibold">Create an export</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Select up to 366 days. The archive contains newline-delimited JSON
            records.
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="export-start">Start date (UTC)</Label>
            <Input id="export-start" name="startDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="export-end">End date (UTC, inclusive)</Label>
            <Input id="export-end" name="endDate" type="date" required />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t p-5">
          <p className="text-xs text-muted-foreground">
            Exports are available for 24 hours to the requesting administrator.
          </p>
          <Button
            type="submit"
            disabled={
              pending ||
              (!!job && ["Pending", "Processing"].includes(job.status))
            }
          >
            <FileArchive className="size-4" />
            {pending ? "Queuing…" : "Create export"}
          </Button>
        </div>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {job && (
        <section className="space-y-4 rounded-lg border p-5" aria-live="polite">
          <div className="flex justify-between gap-3">
            <h2 className="text-sm font-semibold">Audit export</h2>
            <Badge variant="outline">{job.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {job.start} — {job.end}
          </p>
          <div
            role="progressbar"
            aria-label="Export progress"
            aria-valuenow={job.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {job.id}
          </p>
          {job.status === "Completed" && (
            <Button render={<a href={`/api/exports/${job.id}`} download />}>
              <Download className="size-4" />
              Download ZIP
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
