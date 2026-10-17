"use client";
import type { z } from "zod";
import type { dashboardSchema } from "@/lib/contracts";
import Link from "next/link";
import {
  FileText,
  Users,
  ImageIcon,
  FolderTree,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { useTenant } from "@/components/providers/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export type DashboardStats = z.infer<typeof dashboardSchema>;
export function DashboardClient({ stats }: { stats: DashboardStats | null }) {
  const { activeTenant } = useTenant();
  const canEdit =
    activeTenant?.role === "ADMIN" || activeTenant?.role === "EDITOR";
  if (!stats)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Overview unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          We could not load this workspace. Refresh the page to try again.
        </p>
      </div>
    );
  const metrics = [
    {
      label: "Content",
      value: stats.totalContent,
      detail: `${stats.drafts} awaiting publication`,
      icon: FileText,
    },
    {
      label: "Published",
      value: stats.published,
      detail: "Available through your content API",
      icon: FolderTree,
    },
    {
      label: "Media files",
      value: stats.mediaCount,
      detail: "Workspace library",
      icon: ImageIcon,
    },
    {
      label: "Members",
      value: stats.activeUsers,
      detail: "People with workspace access",
      icon: Users,
    },
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {activeTenant?.name}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Workspace overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Content, publishing, and access at a glance.
          </p>
        </div>
        {canEdit && (
          <Button render={<Link href="/dashboard/content/create" />}>
            <Plus className="size-4" />
            Create content
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <section
            key={metric.label}
            className="rounded-lg border bg-card p-4 sm:p-5"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {metric.label}
              <metric.icon className="size-4" />
            </div>
            <p className="my-3 text-3xl font-semibold tabular-nums">
              {metric.value.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{metric.detail}</p>
          </section>
        ))}
      </div>
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold">Recently updated content</h2>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              The latest changes in this workspace.
            </p>
          </div>
          <Link
            href="/dashboard/content"
            className="flex items-center gap-1 text-xs font-medium"
          >
            View all
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="pl-5">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.recentContent.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-40 text-center text-muted-foreground"
                >
                  No content yet.{" "}
                  {canEdit
                    ? "Create your first article to begin."
                    : "Your team's content will appear here."}
                </TableCell>
              </TableRow>
            ) : (
              stats.recentContent.map((content) => (
                <TableRow key={content.id}>
                  <TableCell className="max-w-48 pl-5 sm:max-w-80">
                    <Link
                      href={`/dashboard/content/${content.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {content.title}
                    </Link>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {[content.author.firstName, content.author.lastName]
                        .filter(Boolean)
                        .join(" ") || content.author.email}
                    </div>
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
                  <TableCell className="text-muted-foreground">
                    {content.category?.name || "Uncategorized"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(content.updatedAt).toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border p-5">
          <h2 className="text-sm font-semibold">Publishing workflow</h2>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Drafts</span>
            <span className="font-medium tabular-nums">{stats.drafts}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Published</span>
            <span className="font-medium tabular-nums">{stats.published}</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-foreground"
              style={{
                width: `${stats.totalContent ? (stats.published / stats.totalContent) * 100 : 0}%`,
              }}
            />
          </div>
        </section>
        <section className="rounded-lg border p-5">
          <h2 className="text-sm font-semibold">Workspace directory</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Link
              className="flex justify-between hover:underline"
              href="/dashboard/categories"
            >
              <span>Categories</span>
              <span className="tabular-nums">{stats.categoriesCount}</span>
            </Link>
            <Link
              className="flex justify-between hover:underline"
              href="/dashboard/media"
            >
              <span>Media library</span>
              <ArrowUpRight className="size-4" />
            </Link>
            {activeTenant?.role === "ADMIN" && (
              <Link
                className="flex justify-between hover:underline"
                href="/dashboard/audit"
              >
                <span>Audit trail</span>
                <ArrowUpRight className="size-4" />
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
