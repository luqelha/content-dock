import { cookies } from "next/headers";
import { DashboardClient } from "./dashboard-client";
import { fetchAnalytics } from "@/lib/api";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const activeTenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  let stats = null;

  if (token && activeTenantId) {
    try {
      stats = await fetchAnalytics(token, activeTenantId);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  }

  return <DashboardClient stats={stats} />;
}
