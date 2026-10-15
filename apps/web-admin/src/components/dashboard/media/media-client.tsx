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
import { useTenant } from "@/components/providers/tenant-provider";
import { Input } from "@/components/ui/input";

interface MediaClientProps {
  initialData: MediaItem[];
  page?: number;
}

export function MediaClient({ initialData, page = 1 }: MediaClientProps) {
  const { activeTenant } = useTenant();
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
      const res = await getMediaList(page);
      if (res.error) setErrorMsg(res.error);
      if (res.data) {
        setItems(res.data);
      }
    } catch {
      setErrorMsg("Failed to refresh media library. Please retry.");
    }
  }, [page]);

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

    if (res.deletedIds.length) {
      setItems((prev) =>
        prev.filter((item) => !res.deletedIds.includes(item.id)),
      );
      if (previewMedia && res.deletedIds.includes(previewMedia.id)) {
        setPreviewMedia(null);
      }
      setSelectedIds((prev) =>
        prev.filter((id) => !res.deletedIds.includes(id)),
      );
    }
  };

  const isFiltered =
    Boolean(searchQuery.trim()) ||
    typeFilter !== "all" ||
    sortOption !== "newest";

  if (activeTenant?.role === "VIEWER") {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Media library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse files shared with this workspace. Your role provides read
            access.
          </p>
        </header>
        <Input
          aria-label="Search media"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="max-w-sm"
        />
        <div className="divide-y rounded-md border">
          {filteredAndSortedItems.length ? (
            filteredAndSortedItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm hover:bg-muted/50"
              >
                <span className="min-w-0 break-all">
                  {item.url.split("/").pop()}
                </span>
                <span className="text-muted-foreground">{item.type}</span>
              </a>
            ))
          ) : (
            <p className="p-6 text-sm text-muted-foreground">No files found.</p>
          )}
        </div>
      </div>
    );
  }

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
