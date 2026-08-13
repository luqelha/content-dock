"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  FileText,
  Home,
  ImageIcon,
  LayoutGrid,
  Settings,
  Users,
  LogOut,
  ChevronRight,
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { logout } from "@/actions/auth";

/* ── Navigation data ── */

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  {
    title: "Content",
    href: "/dashboard/content",
    icon: FileText,
    badge: "12",
    badgeVariant: "secondary",
  },
  { title: "Categories", href: "/dashboard/categories", icon: LayoutGrid },
  { title: "Media", href: "/dashboard/media", icon: ImageIcon },
];

const managementNav: NavItem[] = [
  {
    title: "Users",
    href: "/dashboard/users",
    icon: Users,
    badge: "New",
    badgeVariant: "default",
  },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

/* ── Animation variants ── */

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const labelVariants: Variants = {
  hidden: { opacity: 0, y: -4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ── Active indicator (animated pill behind active item) ── */

function ActiveIndicator() {
  return (
    <motion.div
      layoutId="sidebar-active-indicator"
      className="absolute inset-0 rounded-md bg-sidebar-accent"
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 30,
      }}
    />
  );
}

/* ── Nav section component ── */

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  return (
    <SidebarGroup>
      <motion.div variants={labelVariants} initial="hidden" animate="show">
        <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
          {label}
        </SidebarGroupLabel>
      </motion.div>
      <SidebarGroupContent>
        <SidebarMenu>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <motion.div key={item.title} variants={itemVariants}>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      tooltip={item.title}
                      isActive={isActive}
                      className="relative group/nav-item transition-colors duration-200"
                    >
                      {/* Animated active background */}
                      <AnimatePresence>
                        {isActive && <ActiveIndicator />}
                      </AnimatePresence>

                      {/* Icon with subtle scale on active */}
                      <motion.span
                        className="relative z-10"
                        animate={{
                          scale: isActive ? 1.1 : 1,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </motion.span>

                      {/* Label text */}
                      <span className="relative z-10">{item.title}</span>
                    </SidebarMenuButton>

                    {/* Badge (count or label) */}
                    {item.badge && !isCollapsed && (
                      <SidebarMenuBadge>
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 20,
                            delay: 0.2,
                          }}
                        >
                          <Badge
                            variant={item.badgeVariant}
                            className="text-[9px] px-1.5 py-0 h-4"
                          >
                            {item.badge}
                          </Badge>
                        </motion.div>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                </motion.div>
              );
            })}
          </motion.div>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

import { useTenant } from "@/components/providers/tenant-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

/* ── Main sidebar component ── */

export function AppSidebar() {
  const pathname = usePathname();
  const { user, tenants, activeTenant, setActiveTenant } = useTenant();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* ── Header / Logo ── */}
      <SidebarHeader className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2.5 font-semibold text-[15px] tracking-tight group focus:outline-none">
            <div className="flex items-center gap-2.5">
              <motion.span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold"
                whileHover={{ scale: 1.1, rotate: -3 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                A
              </motion.span>
              <motion.span
                className="truncate group-data-[collapsible=icon]:hidden"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                {activeTenant?.name || "Atlas"}
              </motion.span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-50">
            {tenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => setActiveTenant(tenant)}
                className="flex items-center justify-between"
              >
                <span>{tenant.name}</span>
                {activeTenant?.id === tenant.id && (
                  <Badge variant="secondary" className="text-[9px]">
                    Active
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      {/* ── Navigation sections ── */}
      <SidebarContent>
        <NavSection label="Main" items={mainNav} pathname={pathname} />
        {activeTenant?.role === "ADMIN" && (
          <>
            <SidebarSeparator />
            <NavSection
              label="Management"
              items={managementNav}
              pathname={pathname}
            />
          </>
        )}
      </SidebarContent>

      {/* ── Footer: user profile ── */}
      <SidebarFooter className="border-t border-sidebar-border">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Profile"
                className="h-auto py-2 group/profile"
              >
                <div className="relative">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] font-bold bg-foreground text-background">
                      {user?.email?.substring(0, 2).toUpperCase() || "AD"}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
                </div>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-[13px] font-medium truncate">
                    {user?.email ? user.email.split("@")[0] : "Admin User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email || "admin@atlas.io"}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden opacity-0 group-hover/profile:opacity-100 transition-opacity" />
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Logout */}
            <SidebarMenuItem>
              <form action={logout}>
                <SidebarMenuButton
                  render={<button type="submit" />}
                  tooltip="Logout"
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </form>
            </SidebarMenuItem>
          </SidebarMenu>
        </motion.div>
      </SidebarFooter>

      {/* Drag rail for resizing */}
      <SidebarRail />
    </Sidebar>
  );
}
