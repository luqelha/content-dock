"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getColumns, Content, CategoryItemRef } from "./columns";
import { Plus } from "lucide-react";
import { DeleteModal } from "@/components/dashboard/categories/delete-modal";
import { CategoryModal } from "@/components/dashboard/categories/category-modal";
import { deleteContent } from "@/actions/contents";
import { deleteCategory } from "@/actions/categories";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DataTableProps {
  data: Content[];
}

export function DataTable({ data }: DataTableProps) {
  const router = useRouter();
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryItemRef | null>(
    null,
  );
  const [categoryToDelete, setCategoryToDelete] =
    useState<CategoryItemRef | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEdit = (content: Content) => {
    router.push(`/dashboard/content/${content.id}`);
  };

  const handleDelete = (content: Content) => {
    setContentToDelete(content);
  };

  const handleCreate = () => {
    router.push("/dashboard/content/create");
  };

  const handleEditCategory = (category: CategoryItemRef) => {
    setCategoryToEdit(category);
  };

  const handleDeleteCategory = (category: CategoryItemRef) => {
    setCategoryToDelete(category);
  };

  const handleDeleteConfirm = async () => {
    if (!contentToDelete) return;
    setErrorMsg(null);

    const result = await deleteContent(contentToDelete.id);
    if (result.error) {
      console.error("Failed to delete content:", result.error);
      setErrorMsg(result.error);
    } else {
      router.refresh();
    }
    setContentToDelete(null);
  };

  const handleCategoryDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setErrorMsg(null);

    const result = await deleteCategory(categoryToDelete.id);
    if (result.error) {
      console.error("Failed to delete category:", result.error);
      setErrorMsg(result.error);
    } else {
      router.refresh();
    }
    setCategoryToDelete(null);
  };

  const handleCategorySaved = () => {
    router.refresh();
  };

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: getColumns(
      handleEdit,
      handleDelete,
      handleEditCategory,
      handleDeleteCategory,
    ),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Content
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your articles, posts, and pages.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Content
        </Button>
      </div>

      <div className="rounded-xl border border-border/80 dark:border-neutral-700/80 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50 dark:bg-neutral-900/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No content found. Click &quot;Add Content&quot; to create your
                  first post.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      {/* Reusable Delete Modal for Content */}
      <DeleteModal
        isOpen={!!contentToDelete}
        onClose={() => setContentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Content"
        categoryName={contentToDelete?.title || ""}
      />

      {/* Reusable Modal for Editing Category */}
      <CategoryModal
        isOpen={!!categoryToEdit}
        onClose={() => setCategoryToEdit(null)}
        category={categoryToEdit}
        onSuccess={handleCategorySaved}
      />

      {/* Reusable Delete Modal for Category */}
      <DeleteModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleCategoryDeleteConfirm}
        title="Delete Category"
        categoryName={categoryToDelete?.name || ""}
      />
    </div>
  );
}
