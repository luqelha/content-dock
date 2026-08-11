"use client";

import { motion } from "framer-motion";
import { Database, Webhook, Shield, LayoutDashboard } from "lucide-react";
import { BentoCard } from "./bento-card";
import { staggerContainer } from "./animations";

export function Features() {
  return (
    <section id="features" className="relative py-24 md:py-40">
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="max-w-2xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
            Everything you need to <br /> ship faster.
          </h2>
          <p className="text-base text-zinc-500 dark:text-zinc-400 font-medium">
            A complete toolkit for content modeling, delivery, and management.
            Designed with extreme attention to detail.
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-6"
        >
          {/* Large Card 1 */}
          <BentoCard className="md:col-span-2 min-h-90 flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -z-10" />
            <div className="p-2 w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-12">
              <Database className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mb-3">
                Structured content modeling
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed max-w-md">
                Define schemas with typed fields, precise relations, and
                advanced validations. Maintain a clean architecture.
              </p>
            </div>
          </BentoCard>

          {/* Small Card 1 */}
          <BentoCard className="min-h-90 flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -z-10" />
            <div className="p-2 w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-12">
              <Webhook className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mb-3">
                Instant APIs
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed">
                Access your data globally via high-performance REST and GraphQL
                endpoints.
              </p>
            </div>
          </BentoCard>

          {/* Small Card 2 */}
          <BentoCard className="min-h-90 flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -z-10" />
            <div className="p-2 w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-12">
              <Shield className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mb-3">
                Granular Access
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed">
                Custom roles, precise permissions, and comprehensive audit logs.
              </p>
            </div>
          </BentoCard>

          {/* Large Card 2 */}
          <BentoCard className="md:col-span-2 min-h-90 flex flex-col justify-between">
            <div className="absolute right-0 bottom-0 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] -z-10" />
            <div className="p-2 w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-12">
              <LayoutDashboard className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mb-3">
                Revision history & diffs
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed max-w-lg">
                Every save creates a version. Compare visual diffs, roll back
                instantly, and review changes with extreme confidence before
                publishing.
              </p>
            </div>
          </BentoCard>
        </motion.div>
      </div>
    </section>
  );
}
