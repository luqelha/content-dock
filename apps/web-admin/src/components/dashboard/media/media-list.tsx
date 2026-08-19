"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadFile } from "@/lib/download";

interface MediaListProps {
  items: MediaItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onPreview: (media: MediaItem) => void;
  onDelete: (media: MediaItem) => void;
}

export function MediaList({
  items,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onPreview,
  onDelete,
}: MediaListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const handleCopy = async (id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (
    id: string,
    url: string,
    filename: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      setDownloadingId(id);
      await downloadFile(url, filename);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12 text-center">
              <button
                type="button"
                onClick={allSelected ? onDeselectAll : onSelectAll}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            </TableHead>
            <TableHead className="w-16">Preview</TableHead>
            <TableHead>File Name</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead className="hidden md:table-cell">URL</TableHead>
            <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {items.map((item) => {
              const filename = item.url.split("/").pop() || "media-file";
              const isImage = item.type.startsWith("image/");
              const isPdf = item.type.includes("pdf");
              const isSelected = selectedIds.includes(item.id);
              const isDownloading = downloadingId === item.id;
              const typeTag = item.type.includes("/")
                ? item.type.split("/")[1].toUpperCase()
                : item.type.toUpperCase();

              const formattedDate = new Date(item.createdAt).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }
              );

              return (
                <TableRow
                  key={item.id}
                  onClick={() => onPreview(item)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-muted/70 hover:bg-muted/90 font-medium"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <TableCell
                    className="text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(item.id);
                    }}
                  >
                    <button
                      type="button"
                      className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableCell>

                  <TableCell>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={filename}
                          className="w-full h-full object-cover"
                        />
                      ) : isPdf ? (
                        <FileText className="w-5 h-5 text-foreground/70" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="font-medium">
                    <span className="truncate max-w-[200px] sm:max-w-xs block text-sm">
                      {filename}
                    </span>
                  </TableCell>

                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase tracking-wider"
                    >
                      {typeTag}
                    </Badge>
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <span className="truncate max-w-[180px] lg:max-w-[240px]">
                        {item.url}
                      </span>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              onClick={(e) => handleCopy(item.id, item.url, e)}
                              className="p-1 hover:text-foreground transition-colors"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-foreground font-bold" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          }
                        />
                        <TooltipContent side="top">
                          {copiedId === item.id ? "Copied!" : "Copy Link"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>

                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {formattedDate}
                  </TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => onPreview(item)}
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
                              className="h-8 w-8 rounded-lg"
                              disabled={isDownloading}
                              onClick={(e) => handleDownload(item.id, item.url, filename, e)}
                            >
                              {isDownloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
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
                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => onDelete(item)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <TooltipContent side="top">Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
