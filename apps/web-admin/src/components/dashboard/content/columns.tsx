"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type Content = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  author: {
    name: string;
  };
  category: {
    name: string;
  };
  createdAt: string;
};

export const getColumns = (
  onEdit: (content: Content) => void,
  onDelete?: (content: Content) => void,
): ColumnDef<Content>[] => [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category;
      return category ? category.name : "Uncategorized";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as
        "DRAFT" | "PUBLISHED" | "ARCHIVED";
      if (status === "PUBLISHED") {
        return <Badge variant="default">Published</Badge>;
      }
      if (status === "ARCHIVED") {
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground border-dashed"
          >
            Archived
          </Badge>
        );
      }
      return <Badge variant="secondary">Draft</Badge>;
    },
  },
  {
    accessorKey: "author.name",
    header: "Author",
    cell: ({ row }) => {
      return row.original.author?.name || "Unknown";
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      return new Date(row.getValue("createdAt")).toLocaleDateString();
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const content = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(content.id)}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(content)}>
              Edit Content
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete?.(content)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
