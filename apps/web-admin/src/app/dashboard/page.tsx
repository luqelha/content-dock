import { cookies } from "next/headers";
import {
  DashboardClient,
  type DashboardStats,
} from "@/components/dashboard/dashboard-client";
import { workspaceRequest } from "@/lib/workspace-api";
import { WorkspaceSettings } from "@/components/dashboard/workspace-settings";
export default async function DashboardPage() {
  const tenants = await workspaceRequest<{ id: string }[]>("/tenants");
  if (!tenants.length) return <WorkspaceSettings create />;
  const selected = (await cookies()).get("atlas_active_tenant_id")?.value;
  const id = tenants.find((t) => t.id === selected)?.id || tenants[0].id;
  const stats = await workspaceRequest<DashboardStats>(
    "/analytics/dashboard",
    {},
    id,
  );
  return <DashboardClient stats={stats} />;
}
