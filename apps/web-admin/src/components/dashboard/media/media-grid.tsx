"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MediaItem } from "@/actions/media";
import { MediaCard } from "./media-card";

interface MediaGridProps {
  items: MediaItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onPreview: (media: MediaItem) => void;
  onDelete: (media: MediaItem) => void;
}

export function MediaGrid({
  items,
  selectedIds,
  onToggleSelect,
  onPreview,
  onDelete,
}: MediaGridProps) {
  return (
    <motion.div
      layout
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
    >
      <AnimatePresence mode="popLayout">
        {items.map((media) => (
          <MediaCard
            key={media.id}
            media={media}
            isSelected={selectedIds.includes(media.id)}
            onToggleSelect={onToggleSelect}
            onPreview={onPreview}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
