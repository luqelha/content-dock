"use client";

import { motion } from "framer-motion";
import { FileText, Users, HardDrive, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ContentStatus } from "@/components/dashboard/content-status";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TopContent } from "@/components/dashboard/top-content";
import { TeamOverview } from "@/components/dashboard/team-overview";

interface DashboardStats {
  totalContent?: number | string;
  activeUsers?: number | string;
  storageUsed?: string;
  contentGrowth?: string;
}

export function DashboardClient({ stats }: { stats: DashboardStats }) {
  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-350 mx-auto space-y-5 sm:space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
              <span className="hidden sm:inline">
                Welcome back. Here&apos;s what&apos;s happening across your
                workspace.
              </span>
              <span className="sm:hidden">Your workspace overview.</span>
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            All systems operational
          </motion.div>
        </div>
      </motion.div>

      {/* Metric cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Content"
          value={stats?.totalContent?.toString() || "0"}
          detail="+12% from last month"
          detailType="positive"
          icon={FileText}
          index={0}
        />
        <MetricCard
          label="Active Users"
          value={stats?.activeUsers?.toString() || "0"}
          detail="+3 new this week"
          detailType="positive"
          icon={Users}
          index={1}
        />
        <MetricCard
          label="Storage Used"
          value={stats?.storageUsed || "0 GB"}
          detail="85% of 56 GB limit"
          detailType="neutral"
          icon={HardDrive}
          index={2}
        />
        <MetricCard
          label="Content Growth"
          value={stats?.contentGrowth || "0%"}
          detail="vs. previous period"
          detailType="positive"
          icon={TrendingUp}
          index={3}
        />
      </div>

      {/* Charts + Activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="lg:col-span-3">
          <ActivityChart />
        </div>
        <div className="lg:col-span-2">
          <ContentStatus />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2">
          <TopContent />
        </div>
        <div className="space-y-4">
          <QuickActions />
          <TeamOverview />
        </div>
      </div>

      {/* Recent activity — full width */}
      <RecentActivity />
    </div>
  );
}
