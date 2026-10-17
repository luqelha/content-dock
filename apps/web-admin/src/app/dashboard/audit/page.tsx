import { auditPageSchema } from "@/lib/contracts";
import Link from "next/link";
import { workspaceRequest } from "@/lib/workspace-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
type Log = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  userId: string | null;
  ipAddress: string | null;
  createdAt: string;
  details: unknown;
};
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const action = typeof params.action === "string" ? params.action : "";
  const entity = typeof params.entity === "string" ? params.entity : "";
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(action ? { action } : {}),
    ...(entity ? { entity } : {}),
  });
  let result: { data: Log[]; meta: { total: number; totalPages: number } };
  try {
    result = await workspaceRequest(`/audit-logs?${query}`, auditPageSchema);
  } catch (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Audit trail</h1>
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "Unable to load audit trail."}
        </p>
      </div>
    );
  }
  const href = (next: number) => {
    const q = new URLSearchParams(query);
    q.set("page", String(next));
    return `/dashboard/audit?${q}`;
  };
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit trail</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A record of changes within your workspace. Times shown in UTC.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/dashboard/exports" />}>
          Export logs
        </Button>
      </div>
      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <label htmlFor="audit-action" className="text-xs font-medium">
            Action
          </label>
          <Input
            id="audit-action"
            name="action"
            placeholder="e.g. CREATE_CONTENT"
            defaultValue={action}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="audit-entity" className="text-xs font-medium">
            Entity
          </label>
          <Input
            id="audit-entity"
            name="entity"
            placeholder="e.g. Content"
            defaultValue={entity}
          />
        </div>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
        {(action || entity) && (
          <Link className="pb-2 text-xs underline" href="/dashboard/audit">
            Clear
          </Link>
        )}
      </form>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="pl-5">Time (UTC)</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap pl-5 text-xs tabular-nums">
                  {new Date(log.createdAt)
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 19)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {log.action.replaceAll("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>{log.entity || "—"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {log.userId?.slice(0, 8) || "System"}
                </TableCell>
                <TableCell>
                  <details>
                    <summary className="cursor-pointer text-xs">
                      View details
                    </summary>
                    <dl className="mt-2 space-y-2 text-xs">
                      <div>
                        Actor:{" "}
                        <span className="break-all">
                          {log.userId || "System"}
                        </span>
                      </div>
                      <div>
                        Record:{" "}
                        <span className="break-all">{log.entityId || "—"}</span>
                      </div>
                      <div>IP: {log.ipAddress || "—"}</div>
                    </dl>
                    <pre className="mt-2 max-w-72 overflow-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                </TableCell>
              </TableRow>
            ))}
            {!result.data.length && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-40 text-center text-muted-foreground"
                >
                  No activity matches these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {result.meta.total} records · Page {page} of{" "}
          {Math.max(1, result.meta.totalPages)}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={href(page - 1)} />}
            >
              Previous
            </Button>
          )}
          {page < result.meta.totalPages && (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={href(page + 1)} />}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
