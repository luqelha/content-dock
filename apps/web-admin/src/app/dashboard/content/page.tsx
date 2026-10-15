import { DataTable } from "@/components/dashboard/content/data-table";
import { workspaceRequest } from "@/lib/workspace-api";
import { Content } from "@/components/dashboard/content/columns";
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = typeof params.search === "string" ? params.search : "";
  const status =
    params.status === "DRAFT" || params.status === "PUBLISHED"
      ? params.status
      : "";
  const query = new URLSearchParams({
    page: String(page),
    take: "20",
    summary: "true",
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  });
  const result = await workspaceRequest<{
    data: Content[];
    meta: { itemCount: number; pageCount: number };
  }>(`/contents?${query}`);
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <DataTable
        data={result.data}
        page={page}
        total={result.meta.itemCount}
        pageCount={result.meta.pageCount}
        search={search}
        status={status}
      />
    </div>
  );
}
