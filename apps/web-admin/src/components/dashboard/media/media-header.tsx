"use client";

import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaItem } from "@/actions/media";

interface MediaHeaderProps {
  items: MediaItem[];
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onOpenUpload: () => void;
}

export function MediaHeader({
  items,
  viewMode,
  onViewModeChange,
  onOpenUpload,
}: MediaHeaderProps) {
  const totalCount = items.length;
  const imageCount = items.filter((i) => i.type.startsWith("image/")).length;
  const docCount = items.filter(
    (i) => i.type.includes("pdf") || !i.type.startsWith("image/"),
  ).length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      {/* Title & Stats */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Media Library
          </h1>
          <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5">
            {totalCount} {totalCount === 1 ? "asset" : "assets"}
          </Badge>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              ({imageCount} images, {docCount} docs/other)
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Store, organize, and integrate digital assets across your workspace.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 self-start sm:self-auto">
        {/* View Mode Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/60">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            aria-label="Grid View"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            aria-label="List View"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Button */}
        <Button
          onClick={onOpenUpload}
          className="rounded-xl shadow-xs px-4"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Upload Media
        </Button>
      </div>
    </div>
  );
}
