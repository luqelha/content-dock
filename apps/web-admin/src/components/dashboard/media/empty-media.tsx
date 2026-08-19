"use client";

import { motion } from "framer-motion";
import { UploadCloud, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyMediaProps {
  onUploadClick: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyMedia({
  onUploadClick,
  isFiltered = false,
  onClearFilters,
}: EmptyMediaProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center p-8 sm:p-14 text-center rounded-2xl border border-dashed border-border bg-muted/20 backdrop-blur-sm"
    >
      <div className="relative mb-5 flex items-center justify-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground shadow-xs">
          {isFiltered ? (
            <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5]" />
          ) : (
            <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5]" />
          )}
        </div>
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
        {isFiltered ? "No media matches your filter" : "No media uploaded yet"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
        {isFiltered
          ? "Try adjusting your search terms, changing the category filter, or resetting your query."
          : "Start building your digital asset library. Upload images, illustrations, and documents for your articles and pages."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {isFiltered && onClearFilters ? (
          <Button variant="outline" onClick={onClearFilters} className="rounded-xl">
            Clear Filters
          </Button>
        ) : (
          <Button
            onClick={onUploadClick}
            className="rounded-xl px-5"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload Assets
          </Button>
        )}
      </div>
    </motion.div>
  );
}
