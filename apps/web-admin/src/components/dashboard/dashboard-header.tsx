"use client";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Members",
  workspaces: "Workspaces",
  new: "Create workspace",
  audit: "Audit trail",
  exports: "Exports",
  content: "Content",
  create: "Create",
  media: "Media library",
  categories: "Categories",
  settings: "Settings",
  profile: "Profile",
  invitations: "Invitation",
};
export function DashboardHeader() {
  const parts = usePathname().split("/").filter(Boolean);
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:h-14 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
          {parts.map((part, index) => {
            const last = index === parts.length - 1;
            const href = "/" + parts.slice(0, index + 1).join("/");
            const label = labels[part] || "Record";
            return (
              <Fragment key={href}>
                {index > 0 && (
                  <BreadcrumbSeparator className="hidden sm:block" />
                )}
                <BreadcrumbItem
                  className={last ? "min-w-0" : "hidden sm:inline-flex"}
                >
                  {last ? (
                    <BreadcrumbPage className="truncate text-[13px] font-medium">
                      {label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={<Link href={href} />}
                      className="text-[13px]"
                    >
                      {label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <ThemeToggle />
    </header>
  );
}
