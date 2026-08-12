"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const activityData = [
  { label: "Mon", value: 45 },
  { label: "Tue", value: 62 },
  { label: "Wed", value: 38 },
  { label: "Thu", value: 85 },
  { label: "Fri", value: 73 },
  { label: "Sat", value: 28 },
  { label: "Sun", value: 55 },
];

const maxValue = Math.max(...activityData.map((d) => d.value));

export function ActivityChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 sm:gap-2 h-36 sm:h-44">
            {activityData.map((item, i) => {
              const height = (item.value / maxValue) * 100;
              return (
                <div
                  key={item.label}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <motion.div
                    className="w-full rounded-md bg-foreground/10 hover:bg-foreground/20 transition-colors relative overflow-hidden group cursor-default"
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{
                      duration: 0.6,
                      delay: 0.6 + i * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {/* Fill bar */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 rounded-md bg-foreground/90 dark:bg-foreground/80"
                      initial={{ height: 0 }}
                      animate={{ height: "100%" }}
                      transition={{
                        duration: 0.8,
                        delay: 0.8 + i * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />

                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-medium px-2 py-0.5 rounded shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {item.value}
                    </div>
                  </motion.div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
