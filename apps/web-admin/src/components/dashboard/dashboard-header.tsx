"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DashboardHeader() {
  const pathname = usePathname();

  // Build breadcrumb segments from the pathname
  // e.g. /dashboard/content → ["Dashboard", "Content"]
  const parts = pathname.split("/").filter(Boolean);
  const segments = parts.map((seg, i) => ({
    label: capitalize(seg),
    href: "/" + parts.slice(0, i + 1).join("/"),
  }));

  return (
    <motion.header
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-12 sm:h-14 shrink-0 items-center gap-1.5 sm:gap-2 border-b border-border px-3 sm:px-4"
    >
      <SidebarTrigger className="-ml-1" />

      {/* Breadcrumb */}
      <Breadcrumb className="flex-1 min-w-0">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
          {segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            // On mobile, only show the last breadcrumb segment
            const mobileHidden = !isLast && segments.length > 1;
            return (
              <motion.div
                key={seg.href}
                className={`flex items-center gap-1.5 ${mobileHidden ? "hidden sm:flex" : "flex"}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.25,
                  delay: i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-[13px] font-medium truncate max-w-50 sm:max-w-none">
                      {seg.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={<Link href={seg.href} />}
                      className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {seg.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </motion.div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Right side actions */}
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />
      </div>
    </motion.header>
  );
}
