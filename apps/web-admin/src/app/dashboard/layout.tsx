import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TenantProvider } from "@/components/providers/tenant-provider";
import { fetchProfile, fetchTenants } from "@/lib/api";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const activeTenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  let initialUser = null;
  let initialTenants = [];

  if (token) {
    const [user, tenants] = await Promise.all([
      fetchProfile(token),
      fetchTenants(token),
    ]);
    initialUser = user;
    initialTenants = tenants || [];
  }

  return (
    <TenantProvider
      initialUser={initialUser}
      initialTenants={initialTenants}
      initialActiveTenantId={activeTenantId}
    >
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col overflow-hidden">
            <DashboardHeader />
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </TenantProvider>
  );
}
