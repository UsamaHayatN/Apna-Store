"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

interface ArchiveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productTitle: string;
  isArchived: boolean;
  isLoading?: boolean;
}

export function ArchiveConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  productTitle,
  isArchived,
  isLoading = false,
}: ArchiveConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isArchived ? "Restore Product to Catalog" : "Archive Product"}
      description={
        isArchived
          ? "Re-activate this archived product back to draft status."
          : "Hide this product from customer-facing storefront while preserving historic orders."
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-700 leading-relaxed">
            {isArchived ? (
              <p>
                Restoring <strong className="text-neutral-950 font-semibold">{productTitle}</strong> will move it to{" "}
                <span className="font-semibold text-amber-700">Draft</span> status. It will not be visible to shoppers until you explicitly publish it.
              </p>
            ) : (
              <p>
                Archiving <strong className="text-neutral-950 font-semibold">{productTitle}</strong> will immediately remove it from the active storefront catalog, search indices, and category collections. All existing historical customer orders and inventory transactions referencing this product will be preserved.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isArchived ? "primary" : "danger"}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {isArchived ? "Confirm Restore" : "Confirm Archive"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
