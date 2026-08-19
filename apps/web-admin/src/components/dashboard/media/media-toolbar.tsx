"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ArrowUpDown,
  Trash2,
  CheckSquare,
  Square,
  Image as ImageIcon,
  FileCode,
  FileText,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MediaTypeFilter = "all" | "images" | "svg" | "pdf";
export type MediaSortOption = "newest" | "oldest" | "name_asc" | "name_desc";

interface MediaToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  typeFilter: MediaTypeFilter;
  onTypeFilterChange: (val: MediaTypeFilter) => void;
  sortOption: MediaSortOption;
  onSortChange: (val: MediaSortOption) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
}

export function MediaToolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortOption,
  onSortChange,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
}: MediaToolbarProps) {
  const filterTabs: {
    id: MediaTypeFilter;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "all", label: "All Media", icon: Layers },
    { id: "images", label: "Images", icon: ImageIcon },
    { id: "svg", label: "Vectors", icon: FileCode },
    { id: "pdf", label: "Documents", icon: FileText },
  ];

  return (
    <div className="space-y-3">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by file name or type..."
            className="pl-9 pr-9 h-10 rounded-xl bg-card border-border/80"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/60 overflow-x-auto">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTypeFilterChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-card text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <Select
            value={sortOption}
            onValueChange={(val) => onSortChange(val as MediaSortOption)}
          >
            <SelectTrigger className="w-[140px] sm:w-[160px] h-10 rounded-xl bg-card border-border/80 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest" className="text-xs">
                Newest First
              </SelectItem>
              <SelectItem value="oldest" className="text-xs">
                Oldest First
              </SelectItem>
              <SelectItem value="name_asc" className="text-xs">
                Name (A - Z)
              </SelectItem>
              <SelectItem value="name_desc" className="text-xs">
                Name (Z - A)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Multi-Select Action Bar (Conditionally revealed) */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -5 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-muted border border-border shadow-xs">
              <div className="flex items-center gap-2">
                <Badge
                  variant="default"
                  className="rounded-lg px-2 text-xs"
                >
                  {selectedCount} selected
                </Badge>

                {selectedCount < totalCount ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSelectAll}
                    className="h-8 text-xs text-foreground hover:bg-background/80 rounded-lg"
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                    Select All ({totalCount})
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDeselectAll}
                    className="h-8 text-xs text-foreground hover:bg-background/80 rounded-lg"
                  >
                    <Square className="w-3.5 h-3.5 mr-1.5" />
                    Deselect All
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDeselectAll}
                  className="h-8 text-xs rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDeleteSelected}
                  className="h-8 text-xs rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete Selected ({selectedCount})
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
