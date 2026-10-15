"use client";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Trash2,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Calendar,
  Layers,
  Link2,
  Loader2,
} from "lucide-react";
import { MediaItem } from "@/actions/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/download";

interface MediaPreviewModalProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (media: MediaItem) => void;
}

export function MediaPreviewModal({
  media,
  isOpen,
  onClose,
  onDelete,
}: MediaPreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!media) return null;

  const filename = media.url.split("/").pop() || "media-file";
  const isImage = media.type.startsWith("image/");
  const isPdf = media.type.includes("pdf");

  const typeTag = media.type.includes("/")
    ? media.type.split("/")[1].toUpperCase()
    : media.type.toUpperCase();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(media.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleDownload = async () => {
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
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <AccessibleDialog open={isOpen} onClose={onClose} title="Preview media">
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close dialog"
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
              className="relative w-full max-w-5xl rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] z-10"
            >
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close dialog"
                onClick={onClose}
                className="absolute top-4 right-4 z-30 rounded-full h-9 w-9 bg-background/80 hover:bg-background text-foreground border border-border/80 backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Left/Top: Visual Canvas */}
              <div className="relative flex-1 bg-muted/30 flex items-center justify-center p-4 sm:p-8 overflow-hidden min-h-[320px] md:min-h-[500px]">
                {/* Checkerboard pattern for transparencies */}
                <div
                  className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                    backgroundSize: "16px 16px",
                  }}
                />

                {isImage ? (
                  <div className="relative max-w-full max-h-[70vh] flex items-center justify-center overflow-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.url}
                      alt={filename}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setDimensions({
                          width: img.naturalWidth,
                          height: img.naturalHeight,
                        });
                      }}
                      className={`rounded-xl transition-all duration-300 shadow-lg ${
                        isZoomed
                          ? "max-w-none cursor-zoom-out"
                          : "max-w-full max-h-[65vh] object-contain cursor-zoom-in"
                      }`}
                      onClick={() => setIsZoomed(!isZoomed)}
                    />

                    {/* Zoom toggle button */}
                    <button
                      type="button"
                      onClick={() => setIsZoomed(!isZoomed)}
                      className="absolute bottom-3 right-3 p-2 rounded-xl bg-background/80 hover:bg-background text-foreground backdrop-blur-md border border-border/80 text-xs flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      {isZoomed ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" /> Fit to view
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5" /> 100% Zoom
                        </>
                      )}
                    </button>
                  </div>
                ) : isPdf ? (
                  <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                    <div className="w-20 h-20 rounded-2xl bg-muted border border-border text-foreground flex items-center justify-center">
                      <FileText className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-foreground">
                        PDF Document Preview
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        PDF documents can be downloaded directly or opened in a
                        new tab.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => window.open(media.url, "_blank")}
                      className="rounded-xl border-border bg-background hover:bg-muted"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" /> Open in New Tab
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                    <div className="w-20 h-20 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {typeTag} Asset
                    </span>
                  </div>
                )}
              </div>

              {/* Right/Bottom: Metadata Panel */}
              <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-border bg-card p-6 flex flex-col justify-between overflow-y-auto space-y-6">
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] uppercase tracking-wider"
                      >
                        {typeTag}
                      </Badge>
                      {dimensions && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {dimensions.width} × {dimensions.height} px
                        </span>
                      )}
                    </div>
                    <h3
                      title={filename}
                      className="text-base font-semibold text-foreground break-all"
                    >
                      {filename}
                    </h3>
                  </div>

                  <div className="space-y-3.5 text-xs text-muted-foreground border-t border-border pt-4">
                    {/* MIME Type */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="w-3.5 h-3.5" /> MIME Type
                      </span>
                      <span className="font-mono text-foreground">
                        {media.type}
                      </span>
                    </div>

                    {/* Upload Date */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" /> Uploaded
                      </span>
                      <span className="text-foreground">{formattedDate}</span>
                    </div>

                    {/* File URL & Copy */}
                    <div className="space-y-1.5 pt-1">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Link2 className="w-3.5 h-3.5" /> Asset URL
                      </span>
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-muted/40 border border-border/80">
                        <input
                          type="text"
                          readOnly
                          value={media.url}
                          className="bg-transparent text-foreground font-mono text-[11px] w-full outline-none truncate"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleCopyLink}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-foreground font-bold" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full rounded-xl"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download File
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(media.url, "_blank")}
                      className="flex-1 rounded-xl text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
                      Direct
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        onClose();
                        onDelete(media);
                      }}
                      className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 text-xs px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AccessibleDialog>
  );
}
