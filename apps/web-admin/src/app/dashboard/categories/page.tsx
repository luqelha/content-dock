import { cookies } from "next/headers";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { fetchCategories } from "@/lib/api";

export default async function CategoriesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const activeTenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  let categories = [];

  if (token && activeTenantId) {
    try {
      categories = await fetchCategories(token, activeTenantId);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage categories for your content.
        </p>
      </div>

      <DataTable columns={columns} data={categories} />
    </div>
  );
}
