"use client";

import * as React from "react";
import { X, Check, Loader2, Settings, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InventoryItemDetail } from "@/types";

interface InventorySettingsModalProps {
  item: InventoryItemDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedItem: InventoryItemDetail) => void;
}

export function InventorySettingsModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: InventorySettingsModalProps) {
  const [lowStockThreshold, setLowStockThreshold] = React.useState<number>(5);
  const [reorderPoint, setReorderPoint] = React.useState<number>(10);
  const [allowBackorder, setAllowBackorder] = React.useState<boolean>(false);
  const [warehouseLocation, setWarehouseLocation] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && item) {
      setLowStockThreshold(item.lowStockThreshold);
      setReorderPoint(item.reorderPoint);
      setAllowBackorder(item.allowBackorder);
      setWarehouseLocation(item.warehouseLocation || "Main Fulfillment Hub");
      setError(null);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/inventory/${item.variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lowStockThreshold,
          reorderPoint,
          allowBackorder,
          warehouseLocation: warehouseLocation.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update inventory settings.");
      }

      onSuccess(data.item);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border border-neutral-200 shadow-2xl p-6 sm:p-8 animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-mono">
                {item.sku}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-light tracking-tight text-neutral-950 uppercase">
              Inventory Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Low Stock Threshold Trigger
            </label>
            <Input
              type="number"
              min="0"
              max="10000"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
              className="font-mono text-xs"
              required
            />
            <p className="mt-1 text-[11px] text-neutral-400">
              When available units drop at or below this count, a warning badge is triggered.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Reorder Point (Target Restock Level)
            </label>
            <Input
              type="number"
              min="0"
              max="10000"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(parseInt(e.target.value, 10) || 0)}
              className="font-mono text-xs"
              required
            />
            <p className="mt-1 text-[11px] text-neutral-400">
              Suggested minimum threshold for procurement and workshop restocking.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Warehouse Hub / Bin Location
            </label>
            <Input
              type="text"
              value={warehouseLocation}
              onChange={(e) => setWarehouseLocation(e.target.value)}
              placeholder="e.g. London Central Hub - Bay B3"
              className="text-xs"
              required
            />
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowBackorder}
                onChange={(e) => setAllowBackorder(e.target.checked)}
                className="mt-0.5 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
              />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-900 block">
                  Allow Backorders
                </span>
                <span className="text-[11px] text-neutral-500 leading-tight block">
                  Allow customers to purchase this variant when available stock drops to 0.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-neutral-950 text-white hover:bg-neutral-800 text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Policy
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
