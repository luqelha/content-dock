"use client";

import { motion } from "framer-motion";
import {
  Globe,
  Database,
  Terminal,
  Cpu,
  Cloud,
  Box,
  Server,
  Workflow,
} from "lucide-react";

export function Marquee() {
  return (
    <section className="hidden md:block border-y border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 overflow-hidden py-12">
      <div className="mx-auto max-w-7xl px-6 mb-8 text-center">
        <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
          Powering modern digital experiences
        </p>
      </div>
      <div className="flex gap-8 whitespace-nowrap overflow-hidden mask-[linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
        <motion.div
          animate={{ x: [0, -1035] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
          className="flex items-center gap-16 md:gap-24 opacity-50 grayscale dark:invert"
        >
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="flex gap-16 md:gap-24">
              <Globe className="w-8 h-8" />
              <Database className="w-8 h-8" />
              <Terminal className="w-8 h-8" />
              <Cpu className="w-8 h-8" />
              <Cloud className="w-8 h-8" />
              <Box className="w-8 h-8" />
              <Server className="w-8 h-8" />
              <Workflow className="w-8 h-8" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
