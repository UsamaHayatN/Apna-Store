"use client";

import React, { useState } from "react";
import { Category } from "@/types";
import { AlertTriangle, X, ShieldAlert, CheckCircle2 } from "lucide-react";

interface CategoryArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category: Category | null;
}

export function CategoryArchiveModal({
  isOpen,
  onClose,
  onSuccess,
  category,
}: CategoryArchiveModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !category) return null;

  const hasProducts = (category.productCount ?? 0) > 0;
  const hasSubcategories = (category.childrenCount ?? 0) > 0;
  const isBlocked = hasProducts || hasSubcategories;

  const handleArchive = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to archive category");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-neutral-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${isBlocked ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
              {isBlocked ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                {isBlocked ? "Category Deletion Blocked" : "Archive Category"}
              </h3>
              <p className="text-xs text-neutral-500">
                Target: <span className="font-semibold text-neutral-800">{category.name}</span> (<code className="font-mono text-[11px]">{category.slug}</code>)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning or Error Message */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">
            {errorMessage}
          </div>
        )}

        {isBlocked ? (
          <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <p className="font-semibold">
              This category cannot be deleted or archived until dependencies are cleared:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-amber-800">
              {hasProducts && (
                <li>
                  <strong>{category.productCount} product(s)</strong> are currently assigned to this category as their primary or secondary classification.
                </li>
              )}
              {hasSubcategories && (
                <li>
                  <strong>{category.childrenCount} subcategory(ies)</strong> are currently nested under this parent.
                </li>
              )}
            </ul>
            <p className="text-[11px] text-amber-700 pt-1">
              Please reassign these products or subcategories to another category first before archiving.
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-xs text-neutral-600">
            <p>
              Are you sure you want to archive <strong>&ldquo;{category.name}&rdquo;</strong>?
            </p>
            <p className="text-neutral-500">
              Archiving safely soft-deletes this category from active customer navigation. You can restore it at any time from the archived categories filter.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
          >
            {isBlocked ? "Close" : "Cancel"}
          </button>
          {!isBlocked && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleArchive}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Archiving..." : "Confirm Archive"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
