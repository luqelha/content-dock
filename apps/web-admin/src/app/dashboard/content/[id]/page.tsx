import { cookies } from "next/headers";
import { fetchCategories, getContent } from "@/lib/api";
import { ContentForm } from "@/components/dashboard/content/content-form";
import { notFound } from "next/navigation";

interface EditContentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContentPage({
  params,
}: EditContentPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || "";
  const activeTenantId = cookieStore.get("atlas_active_tenant_id")?.value || "";

  let categories = [];
  let initialData = null;

  if (token && activeTenantId) {
    try {
      const [fetchedCategories, fetchedContent] = await Promise.all([
        fetchCategories(token, activeTenantId),
        getContent(token, activeTenantId, id),
      ]);
      categories = fetchedCategories;
      initialData = fetchedContent;
    } catch (error) {
      console.error("Failed to fetch data for edit page:", error);
    }
  }

  if (!initialData) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      <ContentForm
        isEdit
        initialData={initialData}
        categories={categories}
      />
    </div>
  );
}
