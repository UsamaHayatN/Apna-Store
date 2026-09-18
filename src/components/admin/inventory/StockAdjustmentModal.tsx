"use client";

import * as React from "react";
import {
  X,
  Plus,
  Minus,
  AlertTriangle,
  ArrowRight,
  Check,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { InventoryItemDetail, InventoryTransactionReason } from "@/types";

interface StockAdjustmentModalProps {
  item: InventoryItemDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedItem: InventoryItemDetail) => void;
}

const REASONS: { value: InventoryTransactionReason; label: string; description: string }[] = [
  {
    value: "restock",
    label: "Inward Restock / New Delivery",
    description: "New inventory received from supplier or workshop",
  },
  {
    value: "manual_audit",
    label: "Physical Inventory Audit",
    description: "Correction based on physical warehouse stock count",
  },
  {
    value: "cancellation_return",
    label: "Customer Return to Stock",
    description: "Order cancelled or pristine merchandise returned",
  },
  {
    value: "damage_adjustment",
    label: "Damage / Shrinkage Write-off",
    description: "Item damaged, defective, or written off",
  },
  {
    value: "fulfillment",
    label: "Manual Fulfillment Deduction",
    description: "Goods dispatched outside normal automated channel",
  },
  {
    value: "reservation",
    label: "Manual Stock Reservation",
    description: "Hold inventory for VIP client or showroom preview",
  },
];

export function StockAdjustmentModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = React.useState<"relative" | "absolute">("relative");
  const [direction, setDirection] = React.useState<"add" | "remove">("add");
  const [amountInput, setAmountInput] = React.useState<string>("1");
  const [reason, setReason] = React.useState<InventoryTransactionReason>("restock");
  const [notes, setNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && item) {
      setAdjustmentType("relative");
      setDirection("add");
      setAmountInput("1");
      setReason("restock");
      setNotes("");
      setError(null);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const currentStock = item.stockQuantity;
  const parsedAmount = parseInt(amountInput, 10) || 0;

  // Compute resulting stock
  let resultingStock = currentStock;
  let finalDelta = 0;

  if (adjustmentType === "absolute") {
    resultingStock = parsedAmount;
    finalDelta = resultingStock - currentStock;
  } else {
    finalDelta = direction === "add" ? parsedAmount : -parsedAmount;
    resultingStock = currentStock + finalDelta;
  }

  const resultingAvailable = Math.max(0, resultingStock - item.reservedQuantity);
  const isNegative = resultingStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (adjustmentType === "absolute" && parsedAmount < 0) {
      setError("Set stock cannot be negative.");
      return;
    }

    if (adjustmentType === "relative" && parsedAmount <= 0) {
      setError("Adjustment amount must be at least 1.");
      return;
    }

    if (isNegative && !item.allowBackorder) {
      setError("Insufficient stock: total stock cannot drop below 0.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        variantId: item.variantId,
        adjustmentType,
        quantity: adjustmentType === "absolute" ? parsedAmount : finalDelta,
        reason,
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to adjust inventory.");
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
      <div className="relative w-full max-w-lg bg-white border border-neutral-200 shadow-2xl p-6 sm:p-8 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-mono">
                {item.sku}
              </span>
              <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                {item.warehouseLocation}
              </Badge>
            </div>
            <h2 className="mt-1 text-lg font-light tracking-tight text-neutral-950 uppercase">
              Adjust Inventory
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {item.productTitle} — <span className="text-neutral-900">{item.variantTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Indicator */}
        <div className="my-5 grid grid-cols-3 gap-3 bg-neutral-50 p-3.5 border border-neutral-200 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">On Hand</div>
            <div className="text-lg font-semibold text-neutral-900 font-mono">{currentStock}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Reserved</div>
            <div className="text-lg font-semibold text-neutral-500 font-mono">
              {item.reservedQuantity}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Available</div>
            <div className="text-lg font-semibold text-emerald-600 font-mono">
              {item.availableQuantity}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
              Operation Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("relative")}
                className={`py-2 px-3 text-xs font-medium uppercase tracking-wider border text-center transition-all ${
                  adjustmentType === "relative"
                    ? "bg-neutral-950 text-white border-neutral-950"
                    : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                }`}
              >
                +/- Relative Delta
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType("absolute");
                  setAmountInput(String(currentStock));
                  setReason("manual_audit");
                }}
                className={`py-2 px-3 text-xs font-medium uppercase tracking-wider border text-center transition-all ${
                  adjustmentType === "absolute"
                    ? "bg-neutral-950 text-white border-neutral-950"
                    : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                }`}
              >
                Set Absolute Count
              </button>
            </div>
          </div>

          {/* Amount and Direction */}
          {adjustmentType === "relative" ? (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Quantity Delta
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("add")}
                  className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                    direction === "add"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-500"
                      : "bg-white text-neutral-600 border-neutral-300"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Stock (+)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("remove")}
                  className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                    direction === "remove"
                      ? "bg-red-50 text-red-800 border-red-500"
                      : "bg-white text-neutral-600 border-neutral-300"
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  Remove Stock (-)
                </button>
              </div>
              <div className="mt-2">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 10"
                  className="font-mono text-sm"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                New Total Physical Count
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Exact on-hand stock count"
                className="font-mono text-sm"
                required
              />
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
              Adjustment Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as InventoryTransactionReason)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-950"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-neutral-400">
              {REASONS.find((r) => r.value === reason)?.description}
            </p>
          </div>

          {/* Staff Notes */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
              Auditor / Staff Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received PO #8892 from Northampton workshop / Box 4 of 6"
              className="w-full border border-neutral-300 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-950 resize-none"
            />
          </div>

          {/* Live Result Calculation Preview */}
          <div className="p-3 bg-neutral-950 text-neutral-100 flex items-center justify-between border border-neutral-800 text-xs">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase">Previous</span>
                <span className="font-mono font-bold text-neutral-200">{currentStock}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase">Change</span>
                <span
                  className={`font-mono font-bold ${
                    finalDelta > 0
                      ? "text-emerald-400"
                      : finalDelta < 0
                      ? "text-red-400"
                      : "text-neutral-400"
                  }`}
                >
                  {finalDelta > 0 ? `+${finalDelta}` : finalDelta}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase">Resulting On Hand</span>
                <span
                  className={`font-mono font-bold ${
                    isNegative ? "text-red-400 underline" : "text-amber-300"
                  }`}
                >
                  {resultingStock}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block uppercase">New Available</span>
              <span className="font-mono text-white font-bold">{resultingAvailable}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
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
              disabled={loading || isNegative}
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
                  Commit Stock Adjustment
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
