"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContentItem {
  id: number;
  title: string;
  category: string;
  status: "Published" | "Draft";
  date: string;
}

const topContent: ContentItem[] = [
  {
    id: 1,
    title: "Getting Started with Atlas CMS",
    category: "Documentation",
    status: "Published",
    date: "Aug 10",
  },
  {
    id: 2,
    title: "API Integration Guide",
    category: "Engineering",
    status: "Published",
    date: "Aug 9",
  },
  {
    id: 3,
    title: "Content Modeling Best Practices",
    category: "Tutorials",
    status: "Draft",
    date: "Aug 8",
  },
  {
    id: 4,
    title: "Multi-Tenant Architecture Overview",
    category: "Architecture",
    status: "Published",
    date: "Aug 7",
  },
  {
    id: 5,
    title: "Media Pipeline Configuration",
    category: "DevOps",
    status: "Draft",
    date: "Aug 6",
  },
];

export function TopContent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {topContent.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.75 + i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border/50 last:border-0 group cursor-default"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank indicator */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate group-hover:text-foreground transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-2 sm:pl-3">
                  <Badge
                    variant={
                      item.status === "Published" ? "default" : "secondary"
                    }
                    className="text-[10px] px-1.5 py-0 h-5"
                  >
                    {item.status}
                  </Badge>
                  <span className="hidden sm:inline text-[11px] text-muted-foreground w-12 text-right tabular-nums">
                    {item.date}
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
