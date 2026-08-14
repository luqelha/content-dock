import { cookies } from "next/headers";
import { CategoriesClient } from "@/components/dashboard/categories/categories-client";
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
      <CategoriesClient data={categories} />
    </div>
  );
}
