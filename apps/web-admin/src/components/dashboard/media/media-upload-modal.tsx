"use client";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { uploadMedia } from "@/actions/media";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MediaDropzone } from "./media-dropzone";

interface UploadFileItem {
  id: string;
  file: File;
  previewUrl: string;
  sizeFormatted: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function MediaUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: MediaUploadModalProps) {
  const [fileQueue, setFileQueue] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    setGlobalError(null);
    const newItems: UploadFileItem[] = files.map((file) => {
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : "";
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        sizeFormatted: formatBytes(file.size),
        status: "pending",
      };
    });

    setFileQueue((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (id: string) => {
    setFileQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearAll = () => {
    fileQueue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setFileQueue([]);
    setGlobalError(null);
  };

  const handleClose = () => {
    if (isUploading) return;
    handleClearAll();
    onClose();
  };

  const handleUploadAll = async () => {
    const pendingItems = fileQueue.filter(
      (item) => item.status === "pending" || item.status === "error",
    );
    if (pendingItems.length === 0) return;

    setIsUploading(true);
    setGlobalError(null);

    let successCount = 0;

    for (const item of pendingItems) {
      // Mark as uploading
      setFileQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i)),
      );

      try {
        const formData = new FormData();
        formData.append("file", item.file);

        const res = await uploadMedia(formData);

        if (res.error) {
          setFileQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: "error", error: res.error }
                : i,
            ),
          );
        } else {
          successCount++;
          setFileQueue((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, status: "success" } : i,
            ),
          );
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        setFileQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  error: errorMsg,
                }
              : i,
          ),
        );
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      onUploadComplete();
    }
  };

  const totalFiles = fileQueue.length;
  const successFiles = fileQueue.filter((i) => i.status === "success").length;
  const pendingFiles = fileQueue.filter(
    (i) => i.status === "pending" || i.status === "error",
  ).length;

  return (
    <AccessibleDialog open={isOpen} onClose={handleClose} title="Upload media">
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
              onClick={handleClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
              className="relative w-full max-w-2xl rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border p-5 sm:p-6 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      Upload Media
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Add images and documents to your digital library
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close dialog"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="rounded-full h-8 w-8 hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {globalError && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{globalError}</AlertDescription>
                  </Alert>
                )}

                {/* Dropzone Area */}
                <MediaDropzone
                  onFilesSelected={handleFilesSelected}
                  disabled={isUploading}
                />

                {/* Queue List */}
                {fileQueue.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span>
                        Selected Files ({fileQueue.length})
                        {successFiles > 0 && ` • ${successFiles} uploaded`}
                      </span>
                      {!isUploading && (
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {fileQueue.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/70 bg-muted/20"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
                              {item.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.previewUrl}
                                  alt={item.file.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FileText className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">
                                {item.file.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.sizeFormatted}
                                {item.error && (
                                  <span className="text-destructive ml-1.5 font-medium">
                                    — {item.error}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.status === "uploading" && (
                              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="hidden sm:inline">
                                  Uploading...
                                </span>
                              </div>
                            )}

                            {item.status === "success" && (
                              <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Ready</span>
                              </div>
                            )}

                            {item.status === "error" && (
                              <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                                <AlertCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">Failed</span>
                              </div>
                            )}

                            {item.status === "pending" && !isUploading && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveFile(item.id)}
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border p-4 sm:p-5 bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  {pendingFiles > 0
                    ? `${pendingFiles} file(s) ready to upload`
                    : totalFiles > 0
                      ? "All uploads complete!"
                      : "No files selected"}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isUploading}
                    className="rounded-xl"
                  >
                    {successFiles > 0 && pendingFiles === 0 ? "Done" : "Cancel"}
                  </Button>

                  {pendingFiles > 0 && (
                    <Button
                      onClick={handleUploadAll}
                      disabled={isUploading}
                      className="rounded-xl"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload{" "}
                          {pendingFiles > 1 ? `(${pendingFiles})` : "File"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AccessibleDialog>
  );
}
