"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusItems = [
  { label: "Published", count: 847, percentage: 68, color: "bg-foreground" },
  { label: "Draft", count: 312, percentage: 25, color: "bg-foreground/40" },
  { label: "Archived", count: 89, percentage: 7, color: "bg-foreground/15" },
];

export function ContentStatus() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Content Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {statusItems.map((item, i) => (
              <motion.div
                key={item.label}
                className={`${item.color} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{
                  duration: 0.8,
                  delay: 0.7 + i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="space-y-3">
            {statusItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.8 + i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-[13px] text-muted-foreground">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold tabular-nums">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-muted-foreground w-8 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
