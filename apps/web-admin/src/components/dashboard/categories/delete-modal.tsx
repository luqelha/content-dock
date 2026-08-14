"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  categoryName: string;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-background w-full max-w-md rounded-lg p-6 shadow-lg sm:max-w-106.25">
        <h2 className="text-lg font-semibold mb-2">Delete Category</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Are you sure you want to delete the category &quot;{categoryName}
          &quot;? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
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
  );
}
