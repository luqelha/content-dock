"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Home,
  ImageIcon,
  LayoutGrid,
  Settings,
  Users,
  LogOut,
  ScrollText,
  Download,
  Plus,
  ChevronsUpDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTenant } from "@/components/providers/tenant-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout } from "@/actions/auth";
const main = [
  { title: "Overview", href: "/dashboard", icon: Home },
  { title: "Content", href: "/dashboard/content", icon: FileText },
  { title: "Categories", href: "/dashboard/categories", icon: LayoutGrid },
  { title: "Media library", href: "/dashboard/media", icon: ImageIcon },
];
const management = [
  { title: "Members", href: "/dashboard/users", icon: Users },
  { title: "Audit trail", href: "/dashboard/audit", icon: ScrollText },
  { title: "Exports", href: "/dashboard/exports", icon: Download },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];
export function AppSidebar() {
  const pathname = usePathname();
  const { user, tenants, activeTenant, setActiveTenant, switching } =
    useTenant();
  const { setOpenMobile } = useSidebar();
  const workspaceLabel = switching
    ? "Switching workspace…"
    : activeTenant?.name || "Select workspace";
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b px-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={switching}
            className="flex min-w-0 items-center gap-2 rounded-md p-1 text-left focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="min-w-0 flex-1 group-data-[collapsible=icon]:sr-only">
              <span className="block text-sm font-semibold">ContentDock</span>
              <span className="block truncate text-xs text-muted-foreground">
                {workspaceLabel}
              </span>
            </span>
            <span className="sr-only">Switch workspace</span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {tenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => setActiveTenant(tenant)}
                className="justify-between"
              >
                <span className="truncate">{tenant.name}</span>
                {tenant.id === activeTenant?.id && (
                  <span className="text-xs text-muted-foreground">
                    Selected
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/dashboard/workspaces/new" />}
            >
              <Plus className="size-4" />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        {[
          { label: "Workspace", items: activeTenant ? main : main.slice(0, 1) },
          ...(activeTenant?.role === "ADMIN"
            ? [{ label: "Administration", items: management }]
            : []),
        ].map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={
                        pathname === item.href ||
                        (item.href !== "/dashboard" &&
                          pathname.startsWith(item.href + "/"))
                      }
                      render={<Link href={item.href} />}
                      onClick={() => setOpenMobile(false)}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard/profile" />}
              tooltip="My profile"
            >
              <Avatar className="size-6 shrink-0">
                {user?.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt="Profile picture" />
                )}
                <AvatarFallback className="text-[10px] font-semibold">
                  {(user?.firstName || user?.email || "A")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {user?.firstName || user?.email || "My profile"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => logout()} tooltip="Sign out">
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
