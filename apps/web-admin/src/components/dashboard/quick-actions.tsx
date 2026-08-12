"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const quickActions: QuickAction[] = [
  {
    label: "New Content",
    description: "Create a new content entry",
    badge: "Popular",
    badgeVariant: "default",
  },
  {
    label: "Upload Media",
    description: "Upload images or files",
  },
  {
    label: "Manage Categories",
    description: "Organize your content",
  },
  {
    label: "Invite User",
    description: "Add a new team member",
    badge: "New",
    badgeVariant: "secondary",
  },
];

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: 0.7 + i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border border-border p-3",
                  "text-left transition-colors hover:bg-muted/50 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">
                    {action.label}
                  </span>
                  {action.badge && (
                    <Badge
                      variant={action.badgeVariant}
                      className="text-[9px] px-1.5 py-0 h-4"
                    >
                      {action.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground leading-snug">
                  {action.description}
                </span>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
