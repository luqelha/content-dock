"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const isDocs = pathname === "/docs" || pathname.startsWith("/docs/");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:gap-9 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          aria-label="ContentDock home"
          className="flex shrink-0 items-center gap-2.5 rounded-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span>ContentDock</span>
        </Link>
        <div className="flex h-full items-center gap-3 text-sm sm:gap-5">
          <Link
            href="/"
            aria-current={!isDocs ? "page" : undefined}
            className={cn(
              "flex h-full items-center border-b-2 px-0.5 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
              !isDocs
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground",
            )}
          >
            Overview
          </Link>
          <Link
            href="/docs"
            aria-current={isDocs ? "page" : undefined}
            className={cn(
              "flex h-full items-center border-b-2 px-0.5 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
              isDocs
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground",
            )}
          >
            Docs
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <ThemeToggle />
          <Link
            href={isDocs ? "/dashboard" : "/login"}
            className="hidden items-center gap-1.5 rounded-sm text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:flex"
          >
            {isDocs ? "Open workspace" : "Sign in"}
            {isDocs && <ArrowUpRight className="size-3.5" />}
          </Link>
        </div>
      </nav>
    </header>
  );
}
