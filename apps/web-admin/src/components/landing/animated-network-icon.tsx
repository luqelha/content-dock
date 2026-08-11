"use client";

import { motion } from "framer-motion";

export const AnimatedNetworkIcon = () => {
  return (
    <div className="w-6 h-6 flex items-center justify-center relative overflow-hidden bg-transparent rounded-md">
      <motion.div
        className="absolute w-4 h-4 border-[1.5px] border-zinc-950/50 dark:border-white/50 rounded-full"
        animate={{ rotateX: 360, rotateY: 180 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ transformStyle: "preserve-3d" }}
      />
      <motion.div
        className="absolute w-4 h-4 border-[1.5px] border-zinc-950/50 dark:border-white/50 rounded-full"
        animate={{ rotateY: 360, rotateZ: 180 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        style={{ transformStyle: "preserve-3d" }}
      />
      <motion.div
        className="absolute w-1.5 h-1.5 bg-zinc-950 dark:bg-white rounded-full"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};
