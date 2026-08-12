"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedNetworkIcon } from "./animated-network-icon";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl supports-backdrop-filter:bg-white/60 dark:supports-backdrop-filter:bg-zinc-950/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 relative">
        <Link href="/" className="flex items-center gap-2 z-10">
          <AnimatedNetworkIcon />
          <span className="text-[15px] font-semibold tracking-tight">
            Atlas
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 absolute left-1/2 -translate-x-1/2">
          <Link
            href="#features"
            className="hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors"
          >
            Features
          </Link>
          <Link
            href="#developers"
            className="hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors"
          >
            Developers
          </Link>
          <Link
            href="#community"
            className="hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors"
          >
            Community
          </Link>
        </nav>
        <div className="flex items-center gap-4 z-10">
          <Link
            href="/login"
            className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors"
          >
            Log in
          </Link>
          <Link href="/register">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-[13px] font-medium bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-4 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all"
            >
              Get started
            </motion.button>
          </Link>
        </div>
      </div>
    </header>
  );
}
