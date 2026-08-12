"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, ImageIcon, FolderOpen, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    user: "Anya R.",
    initials: "AR",
    action: "published",
    target: "Getting Started Guide",
    icon: FileText,
    time: "2 min ago",
    color: "text-emerald-500",
  },
  {
    id: 2,
    user: "Leo M.",
    initials: "LM",
    action: "uploaded",
    target: "hero-banner.webp",
    icon: ImageIcon,
    time: "14 min ago",
    color: "text-blue-500",
  },
  {
    id: 3,
    user: "Sara K.",
    initials: "SK",
    action: "created category",
    target: "Engineering Blog",
    icon: FolderOpen,
    time: "1 hour ago",
    color: "text-amber-500",
  },
  {
    id: 4,
    user: "System",
    initials: "SY",
    action: "invited",
    target: "dev@atlas.io",
    icon: UserPlus,
    time: "3 hours ago",
    color: "text-violet-500",
  },
  {
    id: 5,
    user: "Anya R.",
    initials: "AR",
    action: "updated",
    target: "API Documentation",
    icon: FileText,
    time: "5 hours ago",
    color: "text-emerald-500",
  },
];

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {activities.map((activity, i) => {
              const Icon = activity.icon;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.6 + i * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex items-start sm:items-center gap-3 py-3 border-b border-border/50 last:border-0 group"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-[10px] font-semibold bg-muted">
                      {activity.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-snug">
                      <span className="font-medium">{activity.user}</span>{" "}
                      <span className="text-muted-foreground">
                        {activity.action}
                      </span>{" "}
                      <span className="font-medium truncate">
                        {activity.target}
                      </span>
                    </p>
                    {/* Time on mobile — below the text */}
                    <span className="sm:hidden text-[11px] text-muted-foreground mt-0.5 block">
                      {activity.time}
                    </span>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity",
                        activity.color,
                      )}
                    />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {activity.time}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
