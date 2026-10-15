import { cookies } from "next/headers";
import { fetchCategories, getContent, getCategory } from "@/lib/api";
import {
  ContentForm,
  type ContentInitialData,
} from "@/components/dashboard/content/content-form";
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
  let initialData: ContentInitialData | null = null;

  if (token && activeTenantId) {
    const [fetchedCategories, fetchedContent] = await Promise.all([
      fetchCategories(token, activeTenantId),
      getContent(token, activeTenantId, id),
    ]);
    categories = fetchedCategories;
    initialData = fetchedContent;
    const selectedCategoryId = initialData?.categoryId;
    if (
      selectedCategoryId &&
      !categories.some((item: { id: string }) => item.id === selectedCategoryId)
    ) {
      const selected = await getCategory(
        token,
        activeTenantId,
        selectedCategoryId,
      );
      if (selected) categories = [selected, ...categories];
    }
  }

  if (!initialData) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      <ContentForm
        key={`${activeTenantId}:${id}`}
        isEdit
        initialData={initialData}
        categories={categories}
      />
    </div>
  );
}
