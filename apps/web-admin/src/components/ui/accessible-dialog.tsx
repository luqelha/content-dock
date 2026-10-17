"use client";
import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";

export function AccessibleDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Popup
          aria-label={title}
          className="fixed inset-0 z-50 outline-none"
        >
          {children}
          <Dialog.Close className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-background focus:p-2">
            Close dialog
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
