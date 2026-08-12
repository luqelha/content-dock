"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  detailType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  index?: number;
}

export function MetricCard({
  label,
  value,
  detail,
  detailType = "neutral",
  icon: Icon,
  index = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Card className="relative overflow-hidden group hover:ring-foreground/20 transition-all duration-300">
        <CardContent className="pt-4 pb-4 sm:pt-5 sm:pb-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-muted-foreground tracking-wide">
                {label}
              </p>
              <motion.p
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1 + 0.2,
                  type: "spring",
                  stiffness: 200,
                }}
              >
                {value}
              </motion.p>
              <p
                className={cn(
                  "text-xs font-medium",
                  detailType === "positive" &&
                    "text-emerald-600 dark:text-emerald-400",
                  detailType === "negative" && "text-red-600 dark:text-red-400",
                  detailType === "neutral" && "text-muted-foreground",
                )}
              >
                {detail}
              </p>
            </div>
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/80 group-hover:bg-muted transition-colors">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>

        {/* Subtle shimmer effect on hover */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-linear-to-r from-transparent via-foreground/2 to-transparent pointer-events-none" />
      </Card>
    </motion.div>
  );
}
