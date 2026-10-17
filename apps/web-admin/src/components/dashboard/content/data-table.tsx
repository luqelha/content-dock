"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Content } from "./columns";
import { useTenant } from "@/components/providers/tenant-provider";
import { deleteContent } from "@/actions/contents";
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
export function DataTable({
  data,
  page,
  total,
  pageCount,
  search,
  status,
}: {
  data: Content[];
  page: number;
  total: number;
  pageCount: number;
  search: string;
  status: string;
}) {
  const { activeTenant } = useTenant();
  const router = useRouter();
  const canEdit =
    activeTenant?.role === "ADMIN" || activeTenant?.role === "EDITOR";
  const [selected, setSelected] = useState<Content | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const href = (next: number) =>
    `/dashboard/content?${new URLSearchParams({ page: String(next), ...(search ? { search } : {}), ...(status ? { status } : {}) })}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage articles, pages, and their publishing status.
          </p>
        </div>
        {canEdit && (
          <Button render={<Link href="/dashboard/content/create" />}>
            <Plus className="size-4" />
            Add content
          </Button>
        )}
      </div>
      <form key={search + status} className="flex flex-wrap gap-3">
        <Input
          name="search"
          aria-label="Search content"
          placeholder="Search content…"
          defaultValue={search}
          className="max-w-sm"
        />
        <select
          name="status"
          aria-label="Filter status"
          className="erp-select"
          defaultValue={status}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <Button type="submit" variant="outline">
          Apply
        </Button>
        {(search || status) && (
          <Link
            href="/dashboard/content"
            className="self-center text-xs underline"
          >
            Clear
          </Link>
        )}
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="pl-5">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right pr-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((content) => (
              <TableRow key={content.id}>
                <TableCell className="max-w-80 pl-5">
                  <Link
                    href={`/dashboard/content/${content.id}`}
                    className="font-medium hover:underline"
                  >
                    {content.title}
                  </Link>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    /{content.slug}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      content.status === "PUBLISHED" ? "default" : "secondary"
                    }
                  >
                    {content.status === "PUBLISHED" ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {content.category?.name || "Uncategorized"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {content.author?.firstName || content.author?.email || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(content.createdAt).toLocaleDateString("en-GB", {
                    timeZone: "UTC",
                  })}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <Link href={`/dashboard/content/${content.id}`} />
                      }
                    >
                      {canEdit ? "Edit" : "View"}
                    </Button>
                    {activeTenant?.role === "ADMIN" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(content)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data.length && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-40 text-center text-muted-foreground"
                >
                  {search || status
                    ? "No content matches these filters."
                    : "No content yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {total} records · Page {page} of {Math.max(1, pageCount)}
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
          {page < pageCount && (
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
      {selected && (
        <section
          role="alertdialog"
          aria-labelledby="delete-content-title"
          className="space-y-3 rounded-lg border border-destructive/30 p-5"
        >
          <h2 id="delete-content-title" className="text-sm font-semibold">
            Delete “{selected.title}”?
          </h2>
          <p className="text-sm text-muted-foreground">
            This permanently removes the content from this workspace.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await deleteContent(selected.id);
                  if (result.error) setError(result.error);
                  else {
                    setSelected(null);
                    router.refresh();
                  }
                })
              }
            >
              Delete content
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
