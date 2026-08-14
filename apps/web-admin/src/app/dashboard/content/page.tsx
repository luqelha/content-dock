import { cookies } from "next/headers";
import { DataTable } from "@/components/dashboard/content/data-table";
import { fetchContents } from "@/lib/api";

export default async function ContentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const activeTenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  let contents = [];

  if (token && activeTenantId) {
    try {
      contents = await fetchContents(token, activeTenantId);
    } catch (error) {
      console.error("Failed to fetch contents:", error);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
      <DataTable data={contents} />
    </div>
  );
}
