"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { fadeUp, staggerContainer } from "./animations";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-32 md:pt-40 md:pb-48 min-h-dvh md:min-h-0 flex flex-col justify-center">
      <div className="mx-auto max-w-7xl px-6 relative z-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-3xl mx-auto text-center flex flex-col items-center"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 mb-8 backdrop-blur-sm"
          >
            <Zap className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 fill-zinc-900/20 dark:fill-zinc-100/20" />
            <span>Atlas 1.0 is now available in Public Beta</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-6xl font-bold tracking-tighter text-zinc-950 dark:text-zinc-50 md:leading-[1.1]"
          >
            The content operating <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-zinc-500 to-zinc-900 dark:from-zinc-400 dark:to-zinc-100">
              system for modern web.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-8 text-base md:text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto font-medium"
          >
            Atlas gives your team a unified interface to model, author, and
            deliver content globally beautifully designed, instantly fast.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
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
    </section>
  );
}
