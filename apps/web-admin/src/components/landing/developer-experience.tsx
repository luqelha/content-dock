"use client";

import { motion } from "framer-motion";
import { Globe, Code2, Terminal } from "lucide-react";

export function DeveloperExperience() {
  return (
    <section
      id="developers"
      className="relative py-24 md:py-40 bg-zinc-50/50 dark:bg-zinc-900/10 border-y border-zinc-200/50 dark:border-zinc-800/50"
    >
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <div className="flex-1 lg:max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-6">
              Built for developers, <br /> loved by editors.
            </h2>
            <p className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8 font-medium">
              Fetch your content using standard web APIs. We provide typed SDKs
              for React, Vue, Svelte, and vanilla JS so you get full
              autocomplete in your editor.
            </p>
            <div className="space-y-5">
              {[
                { icon: Globe, title: "Global edge CDN out of the box" },
                {
                  icon: Code2,
                  title: "Strongly typed GraphQL & REST APIs",
                },
                {
                  icon: Terminal,
                  title: "Webhooks for instant static rebuilds",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                    <item.icon className="w-4 h-4 text-zinc-900 dark:text-zinc-300" />
                  </div>
                  <span className="text-base font-medium text-zinc-700 dark:text-zinc-200">
                    {item.title}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex-1 w-full"
          >
            <div className="rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50 bg-[#0c0c0c] shadow-2xl relative">
              <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#121212]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/90" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/90" />
                  <div className="w-3 h-3 rounded-full bg-green-500/90" />
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  app/page.tsx
                </span>
                <div className="w-10" />
              </div>
              <div className="p-6 md:p-8 overflow-x-auto text-[13px] md:text-sm font-mono leading-relaxed">
                <pre>
                  <code className="text-zinc-300">
                    <span className="text-[#FF7B72]">import</span>{" "}
                    {"{ createClient }"}{" "}
                    <span className="text-[#FF7B72]">from</span>{" "}
                    <span className="text-[#A5D6FF]">
                      &apos;@atlas/sdk&apos;
                    </span>
                    ;{"\n\n"}
                    <span className="text-[#FF7B72]">const</span> client ={" "}
                    <span className="text-[#D2A8FF]">createClient</span>({"{\n"}
                    {"  "}token: process.env.
                    <span className="text-[#79C0FF]">ATLAS_TOKEN</span>,{"\n"}
                    {"});"}
                    {"\n\n"}
                    <span className="text-[#FF7B72]">
                      export default async function
                    </span>{" "}
                    <span className="text-[#D2A8FF]">Page</span>() {"{\n"}
                    {"  "}
                    <span className="text-[#FF7B72]">const</span> posts ={" "}
                    <span className="text-[#FF7B72]">await</span> client.posts.
                    <span className="text-[#D2A8FF]">list</span>({"{\n"}
                    {"    "}limit: <span className="text-[#79C0FF]">10</span>,
                    {"\n"}
                    {"    "}status:{" "}
                    <span className="text-[#A5D6FF]">published</span>
                    {"\n"}
                    {"  });"}
                    {"\n\n"}
                    {"  "}
                    <span className="text-[#FF7B72]">return</span> ({"\n"}
                    {"    "}
                    <span className="text-[#8B949E]">
                      {"// Render your amazing UI here"}
                    </span>
                    {"\n"}
                    {"    "}
                    <span className="text-[#7EE787]">&lt;div&gt;</span>
                    {"..."}
                    <span className="text-[#7EE787]">&lt;/div&gt;</span>
                    {"\n"}
                    {"  "});{"\n"}
                    {"}"}
                  </code>
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
