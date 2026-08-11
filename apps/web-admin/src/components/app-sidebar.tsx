"use client";

import Link from "next/link";
import {
  FileText,
  Home,
  ImageIcon,
  LayoutGrid,
  Settings,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Content", href: "/dashboard/content", icon: FileText },
  { title: "Categories", href: "/dashboard/categories", icon: LayoutGrid },
  { title: "Media", href: "/dashboard/media", icon: ImageIcon },
  { title: "Users", href: "/dashboard/users", icon: Users },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <Link
          href="/dashboard"
          className="flex w-full items-center gap-2.5 font-semibold text-[15px] tracking-tight"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
            A
          </span>
          <span className="truncate group-data-[collapsible=icon]:hidden">
            Atlas
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
