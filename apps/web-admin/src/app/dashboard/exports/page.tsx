import { cookies } from "next/headers";
import { workspaceRequest } from "@/lib/workspace-api";
import { ExportsClient } from "@/components/dashboard/exports-client";
export default async function ExportsPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const id = (await cookies()).get("atlas_active_tenant_id")?.value;
  const tenants =
    await workspaceRequest<{ id: string; role: string }[]>("/tenants");
  if (tenants.find((t) => t.id === id)?.role !== "ADMIN")
    return (
      <p className="p-6">
        Administrator access is required to export audit records.
      </p>
    );
  const { job } = await searchParams;
  const initialJobId = job && /^[a-f0-9-]{36}$/i.test(job) ? job : undefined;
  return <ExportsClient initialJobId={initialJobId} />;
}
