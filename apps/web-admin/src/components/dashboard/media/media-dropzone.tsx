"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";

interface MediaDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFileSizeMb?: number;
  accept?: string;
  disabled?: boolean;
}

export function MediaDropzone({
  onFilesSelected,
  maxFileSizeMb = 5,
  accept = "image/png,image/jpeg,image/webp,image/gif,application/pdf",
  disabled = false,
}: MediaDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      onFilesSelected(droppedFiles);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      onFilesSelected(selected);
    }
    // reset input so the same file can be chosen again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden p-6 sm:p-10 flex flex-col items-center justify-center text-center select-none ${
        disabled
          ? "opacity-50 cursor-not-allowed border-muted"
          : isDragOver
            ? "border-primary bg-muted/60 scale-[1.01]"
            : "border-border/80 hover:border-foreground/30 bg-muted/20 hover:bg-muted/40"
      }`}
    >
      <button
        type="button"
        aria-label="Choose files to upload"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-ring"
      />
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Upload files"
        multiple
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />

      <motion.div
        animate={{ y: isDragOver ? -4 : 0 }}
        className="w-16 h-16 rounded-2xl bg-muted text-foreground flex items-center justify-center mb-4 shadow-xs"
      >
        <UploadCloud className="w-8 h-8 stroke-[1.75]" />
      </motion.div>

      <h4 className="text-base font-semibold text-foreground tracking-tight">
        {isDragOver ? "Drop files to upload" : "Drag and drop your files here"}
      </h4>

      <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-sm">
        Drag files directly or{" "}
        <span className="text-foreground font-medium underline underline-offset-2">
          browse from computer
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-mono">
        <span className="px-2 py-0.5 rounded-md bg-background border border-border/60">
          PNG
        </span>
        <span className="px-2 py-0.5 rounded-md bg-background border border-border/60">
          JPG / JPEG
        </span>
        <span className="px-2 py-0.5 rounded-md bg-background border border-border/60">
          WEBP
        </span>
        <span className="px-2 py-0.5 rounded-md bg-background border border-border/60">
          GIF
        </span>
        <span className="px-2 py-0.5 rounded-md bg-background border border-border/60">
          PDF
        </span>
        <span className="text-muted-foreground/60">
          • Max {maxFileSizeMb}MB per file
        </span>
      </div>
    </div>
  );
}
