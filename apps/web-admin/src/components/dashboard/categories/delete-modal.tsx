"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  categoryName: string;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item",
  categoryName,
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    onClose();
  };

  return (
    <AccessibleDialog
      open={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title={title}
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
        <div className="bg-card dark:bg-neutral-900 text-card-foreground border border-border/80 dark:border-neutral-700/80 w-full max-w-md rounded-2xl p-6 shadow-2xl transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive dark:bg-destructive/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Are you sure you want to delete &quot;
            <span className="font-medium text-foreground">{categoryName}</span>
            &quot;? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={onClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
