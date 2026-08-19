"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { MediaItem } from "@/actions/media";
import { Button } from "@/components/ui/button";

interface MediaDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  media?: MediaItem | null;
  count?: number;
}

export function MediaDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  media,
  count = 1,
}: MediaDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const isBulk = count > 1 || (!media && count >= 1);
  const filename = media?.url.split("/").pop() || "media file";

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
            className="relative w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-6 space-y-5 z-10"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isDeleting}
                className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {isBulk
                  ? `Delete ${count} selected assets?`
                  : "Delete media asset?"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isBulk ? (
                  `Are you sure you want to delete these ${count} assets? This will permanently remove them from storage and cannot be undone.`
                ) : (
                  <>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-foreground break-all">
                      &quot;{filename}&quot;
                    </span>
                    ? This action cannot be reversed.
                  </>
                )}
              </p>
            </div>

            {/* Thumbnail Preview for single item */}
            {!isBulk && media && media.type.startsWith("image/") && (
              <div className="w-full h-24 rounded-xl overflow-hidden bg-muted/40 border border-border/60 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={media.url}
                  alt={filename}
                  className="w-full h-full object-cover opacity-80"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isDeleting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {isBulk ? `(${count})` : "Asset"}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
