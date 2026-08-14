"use client";

import { useState } from "react";
import { DataTable } from "./data-table";
import { getColumns, Category } from "./columns";
import { CategoryModal } from "./category-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { deleteCategory } from "@/actions/categories";
import { DeleteModal } from "./delete-modal";
import { useTenant } from "@/components/providers/tenant-provider";

interface CategoriesClientProps {
  data: Category[];
}

export function CategoriesClient({ data }: CategoriesClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  const { activeTenant } = useTenant();
  const isAdmin = activeTenant?.role === "ADMIN";

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    const result = await deleteCategory(categoryToDelete.id);
    if (result.error) {
      console.error("Failed to delete category:", result.error);
      alert(result.error);
    }
    setCategoryToDelete(null);
  };

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Categories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage categories for your content.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <DataTable
        columns={getColumns(handleEdit, handleDelete, isAdmin)}
        data={data}
      />

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={selectedCategory}
      />

      <DeleteModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        categoryName={categoryToDelete?.name || ""}
      />
    </>
  );
}
