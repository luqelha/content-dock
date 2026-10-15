"use client";

import type { ContentStatus } from "@/lib/api";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  ChevronDown,
  Edit3,
  Trash2,
  FileEdit,
  Trash,
  Copy,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type CategoryItemRef = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
};

export type Content = {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  author: {
    name?: string;
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  category?: CategoryItemRef | null;
  createdAt: string;
};

export const getColumns = (
  onEdit: (content: Content) => void,
  onDelete?: (content: Content) => void,
  onEditCategory?: (category: CategoryItemRef) => void,
  onDeleteCategory?: (category: CategoryItemRef) => void,
): ColumnDef<Content>[] => [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.title}</span>
    ),
  },
  {
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category;
      if (!category) {
        return (
          <span className="text-muted-foreground text-xs italic">
            Uncategorized
          </span>
        );
      }

      return (
        <div className="flex items-center gap-1.5 group">
          <Badge
            variant="outline"
            className="font-normal text-xs bg-muted/40 transition-colors"
          >
            {category.name}
          </Badge>
          {(onEditCategory || onDeleteCategory) && (
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-3 w-3" />
                <span className="sr-only">Category options</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs font-semibold truncate">
                    {category.name}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {onEditCategory && (
                    <DropdownMenuItem onClick={() => onEditCategory(category)}>
                      <Edit3 className="mr-2 h-3.5 w-3.5" />
                      Edit Category
                    </DropdownMenuItem>
                  )}
                  {onDeleteCategory && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDeleteCategory(category)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete Category
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as ContentStatus;
      if (status === "PUBLISHED") {
        return <Badge variant="default">Published</Badge>;
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(content.id)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(content)}>
                <FileEdit className="mr-2 h-4 w-4" />
                Edit Content
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(content)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Content
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
