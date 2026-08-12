"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const teamMembers = [
  { name: "Anya R.", initials: "AR", role: "Admin", status: "online" },
  { name: "Leo M.", initials: "LM", role: "Editor", status: "online" },
  { name: "Sara K.", initials: "SK", role: "Editor", status: "away" },
  { name: "James W.", initials: "JW", role: "Viewer", status: "offline" },
];

export function TeamOverview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.8 + i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center gap-3"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px] font-semibold bg-muted">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status indicator */}
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${
                      member.status === "online"
                        ? "bg-emerald-500"
                        : member.status === "away"
                          ? "bg-amber-500"
                          : "bg-zinc-400 dark:bg-zinc-600"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">
                    {member.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {member.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
