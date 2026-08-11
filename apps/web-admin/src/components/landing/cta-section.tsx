"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden px-6">
      <div className="mx-auto max-w-7xl relative z-10">
        <div className="relative rounded-2xl md:rounded-[20px] overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/50 shadow-2xl dark:shadow-none p-12 md:p-24 text-center flex flex-col items-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.03)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
          <motion.div className="absolute top-[-50%] left-[-20%] w-[150%] h-[200%] bg-[conic-gradient(from_90deg_at_50%_50%,#ffffff_0%,#f4f4f5_20%,#e4e4e7_50%,#f4f4f5_80%,#ffffff_100%)] dark:bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#18181b_20%,#27272a_50%,#18181b_80%,#000000_100%)] opacity-30 pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0" />

          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 },
                },
              }}
            >
              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: "spring", damping: 25, stiffness: 120 },
                  },
                }}
                className="text-4xl md:text-6xl font-bold tracking-tighter text-zinc-950 dark:text-white mb-6"
              >
                Ready to ship?
              </motion.h2>
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: "spring", damping: 25, stiffness: 120 },
                  },
                }}
                className="text-lg text-zinc-500 dark:text-zinc-400 mb-10 font-medium"
              >
                Join thousands of developers building a faster web. Start your
                next project with Atlas today.
              </motion.p>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: "spring", damping: 25, stiffness: 120 },
                  },
                }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/register" className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-semibold px-8 py-3.5 rounded-full shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] transition-all"
                  >
                    Start building for free
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
                <Link href="/docs" className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-medium px-8 py-3.5 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Read the docs
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
