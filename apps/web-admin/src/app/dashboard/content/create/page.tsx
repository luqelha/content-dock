import { cookies } from "next/headers";
import { fetchCategories } from "@/lib/api";
import { ContentForm } from "@/components/dashboard/content/content-form";

export default async function CreateContentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || "";
  const activeTenantId = cookieStore.get("atlas_active_tenant_id")?.value || "";

  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];

  if (token && activeTenantId) {
    categories = await fetchCategories(token, activeTenantId);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      <ContentForm key={activeTenantId} categories={categories} />
    </div>
  );
}
