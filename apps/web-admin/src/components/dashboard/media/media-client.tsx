"use client";

import { useState, useMemo, useCallback } from "react";
import {
  MediaItem,
  getMediaList,
  deleteMedia,
  deleteMultipleMedia,
} from "@/actions/media";
import { MediaHeader } from "./media-header";
import {
  MediaToolbar,
  MediaTypeFilter,
  MediaSortOption,
} from "./media-toolbar";
import { MediaGrid } from "./media-grid";
import { MediaList } from "./media-list";
import { EmptyMedia } from "./empty-media";
import { MediaUploadModal } from "./media-upload-modal";
import { MediaPreviewModal } from "./media-preview-modal";
import { MediaDeleteModal } from "./media-delete-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface MediaClientProps {
  initialData: MediaItem[];
}

export function MediaClient({ initialData }: MediaClientProps) {
  const [items, setItems] = useState<MediaItem[]>(initialData || []);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all");
  const [sortOption, setSortOption] = useState<MediaSortOption>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Refresh items from server
  const refreshLibrary = useCallback(async () => {
    try {
      const res = await getMediaList();
      if (res.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error("Failed to refresh media library:", err);
    }
  }, []);

  // Filter & Sort computation
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const filename = item.url.split("/").pop()?.toLowerCase() || "";
        const type = item.type.toLowerCase();
        return filename.includes(q) || type.includes(q);
      });
    }

    // 2. Type Filter
    if (typeFilter === "images") {
      result = result.filter(
        (item) => item.type.startsWith("image/") && !item.type.includes("svg"),
      );
    } else if (typeFilter === "svg") {
      result = result.filter((item) => item.type.includes("svg"));
    } else if (typeFilter === "pdf") {
      result = result.filter(
        (item) => item.type.includes("pdf") || !item.type.startsWith("image/"),
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortOption === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortOption === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      const nameA = (a.url.split("/").pop() || "").toLowerCase();
      const nameB = (b.url.split("/").pop() || "").toLowerCase();
      if (sortOption === "name_asc") {
        return nameA.localeCompare(nameB);
      }
      if (sortOption === "name_desc") {
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

    return result;
  }, [items, searchQuery, typeFilter, sortOption]);

  // Selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredAndSortedItems.map((i) => i.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSortOption("newest");
  };

  // Single Delete
  const handleSingleDeleteConfirm = async () => {
    if (!mediaToDelete) return;
    setErrorMsg(null);

    const targetId = mediaToDelete.id;
    const res = await deleteMedia(targetId);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setItems((prev) => prev.filter((item) => item.id !== targetId));
      setSelectedIds((prev) => prev.filter((id) => id !== targetId));
      if (previewMedia?.id === targetId) {
        setPreviewMedia(null);
      }
    }
  };

  // Bulk Delete
  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    setErrorMsg(null);

    const res = await deleteMultipleMedia(selectedIds);

    if (res.error) {
      setErrorMsg(res.error);
    }

    if (res.success) {
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      if (previewMedia && selectedIds.includes(previewMedia.id)) {
        setPreviewMedia(null);
      }
      setSelectedIds([]);
    }
  };

  const isFiltered =
    Boolean(searchQuery.trim()) ||
    typeFilter !== "all" ||
    sortOption !== "newest";

  return (
    <div className="space-y-6">
      {/* Global Error Banner */}
      {errorMsg && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <MediaHeader
        items={items}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Toolbar (only show when items exist or when active filters exist) */}
      {(items.length > 0 || isFiltered) && (
        <MediaToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          sortOption={sortOption}
          onSortChange={setSortOption}
          selectedCount={selectedIds.length}
          totalCount={filteredAndSortedItems.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDeleteSelected={() => setIsBulkDeleteOpen(true)}
        />
      )}

      {/* Content Gallery / List / Empty State */}
      {items.length === 0 ? (
        <EmptyMedia
          onUploadClick={() => setIsUploadOpen(true)}
          isFiltered={false}
        />
      ) : filteredAndSortedItems.length === 0 ? (
        <EmptyMedia
          onUploadClick={() => setIsUploadOpen(true)}
          isFiltered={true}
          onClearFilters={handleClearFilters}
        />
      ) : viewMode === "grid" ? (
        <MediaGrid
          items={filteredAndSortedItems}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onPreview={(media) => setPreviewMedia(media)}
          onDelete={(media) => setMediaToDelete(media)}
        />
      ) : (
        <MediaList
          items={filteredAndSortedItems}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onPreview={(media) => setPreviewMedia(media)}
          onDelete={(media) => setMediaToDelete(media)}
        />
      )}

      {/* Upload Modal */}
      <MediaUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={() => {
          refreshLibrary();
        }}
      />

      {/* Lightbox / Preview Modal */}
      <MediaPreviewModal
        media={previewMedia}
        isOpen={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        onDelete={(media) => {
          setMediaToDelete(media);
        }}
      />

      {/* Single Delete Modal */}
      <MediaDeleteModal
        isOpen={Boolean(mediaToDelete)}
        onClose={() => setMediaToDelete(null)}
        onConfirm={handleSingleDeleteConfirm}
        media={mediaToDelete}
        count={1}
      />

      {/* Bulk Delete Modal */}
      <MediaDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        count={selectedIds.length}
      />
    </div>
  );
}
