import {
  ListPagination,
  listPage,
} from "@/components/dashboard/list-pagination";
import { cookies } from "next/headers";
import { CategoriesClient } from "@/components/dashboard/categories/categories-client";
import { fetchCategories } from "@/lib/api";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = listPage((await searchParams).page);
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const activeTenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];

  if (token && activeTenantId) {
    categories = await fetchCategories(token, activeTenantId, page);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
      <CategoriesClient key={`${activeTenantId}:${page}`} data={categories} />
      <ListPagination
        page={page}
        hasNext={categories.length === 50}
        path="/dashboard/categories"
      />
    </div>
  );
}
