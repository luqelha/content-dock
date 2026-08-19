"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Eye,
  Trash2,
  Download,
  FileText,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { MediaItem } from "@/actions/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadFile } from "@/lib/download";

interface MediaCardProps {
  media: MediaItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (media: MediaItem) => void;
  onDelete: (media: MediaItem) => void;
}

export function MediaCard({
  media,
  isSelected,
  onToggleSelect,
  onPreview,
  onDelete,
}: MediaCardProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Extract file name from URL
  const filename = media.url.split("/").pop() || "media-file";
  const isImage = media.type.startsWith("image/") && !imageError;
  const isPdf = media.type.includes("pdf");

  // Friendly type tag
  const typeTag = media.type.includes("/")
    ? media.type.split("/")[1].toUpperCase()
    : media.type.toUpperCase();

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(media.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDownloading(true);
      await downloadFile(media.url, filename);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const formattedDate = new Date(media.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden bg-card ${
        isSelected
          ? "border-primary shadow-sm ring-2 ring-primary/20 bg-primary/[0.02]"
          : "border-border/80 hover:border-foreground/20 shadow-xs hover:shadow-md"
      }`}
    >
      {/* Media Viewport */}
      <div
        onClick={() => onPreview(media)}
        className="relative aspect-square w-full cursor-pointer overflow-hidden bg-muted/40 flex items-center justify-center select-none"
      >
        {/* Subtle checkerboard pattern for transparent graphics */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "12px 12px",
          }}
        />

        {/* Shimmer skeleton while loading */}
        {isImage && !imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-muted/70" />
        )}

        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={filename}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center gap-2 text-foreground/80 p-4 text-center">
            <FileText className="w-12 h-12 stroke-[1.5] text-foreground/70" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              PDF Document
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
            <ImageIcon className="w-12 h-12 stroke-[1.5]" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {typeTag} File
            </span>
          </div>
        )}

        {/* Selection Checkbox Overlay */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(media.id);
          }}
          className={`absolute top-2.5 left-2.5 z-20 transition-opacity duration-200 ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            type="button"
            className={`w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-md transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-black/60 hover:bg-black/80 text-white"
            }`}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* MIME Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <Badge
            variant="secondary"
            className="text-[10px] uppercase font-mono tracking-wider font-semibold bg-background/90 backdrop-blur-md shadow-xs border border-border/60 px-1.5 py-0.5"
          >
            {typeTag}
          </Badge>
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 z-15 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-3 pointer-events-none group-hover:pointer-events-auto">
          <div className="flex items-center justify-center gap-1.5 backdrop-blur-md bg-black/60 rounded-xl p-1.5 border border-white/15 w-fit mx-auto shadow-lg">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onPreview(media)}
                    className="h-8 w-8 rounded-lg text-white hover:text-white hover:bg-white/20"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                }
              />
              <TooltipContent side="top">Preview</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyLink}
                    className="h-8 w-8 rounded-lg text-white hover:text-white hover:bg-white/20"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                }
              />
              <TooltipContent side="top">
                {copied ? "Copied!" : "Copy Link"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="h-8 w-8 rounded-lg text-white hover:text-white hover:bg-white/20"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                }
              />
              <TooltipContent side="top">Download</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(media);
                    }}
                    className="h-8 w-8 rounded-lg text-white hover:text-white hover:bg-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                }
              />
              <TooltipContent side="top">Delete</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3 flex flex-col gap-1 border-t border-border/60 bg-card">
        <p
          title={filename}
          className="text-xs font-medium text-foreground truncate"
        >
          {filename}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{formattedDate}</span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 hover:text-foreground transition-colors font-mono text-[10px]"
          >
            {copied ? (
              <span className="text-foreground font-medium">Copied!</span>
            ) : (
              <span>Copy URL</span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
