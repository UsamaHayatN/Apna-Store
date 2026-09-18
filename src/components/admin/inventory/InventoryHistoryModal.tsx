"use client";

import * as React from "react";
import { X, History, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { InventoryItemDetail, InventoryTransactionDetail } from "@/types";

interface InventoryHistoryModalProps {
  item: InventoryItemDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryHistoryModal({
  item,
  isOpen,
  onClose,
}: InventoryHistoryModalProps) {
  const [transactions, setTransactions] = React.useState<InventoryTransactionDetail[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      setError(null);
      fetch(`/api/admin/inventory/transactions?variantId=${encodeURIComponent(item.variantId)}&limit=30`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setTransactions(data.transactions || []);
          } else {
            setError(data.error || "Failed to load audit ledger.");
          }
        })
        .catch((err) => {
          setError(err.message || "Failed to connect.");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const formatReason = (reason: string) => {
    switch (reason) {
      case "restock":
        return { label: "Inward Restock", variant: "success" as const };
      case "reservation":
        return { label: "Reservation", variant: "neutral" as const };
      case "fulfillment":
        return { label: "Order Fulfillment", variant: "neutral" as const };
      case "cancellation_return":
        return { label: "Return to Stock", variant: "neutral" as const };
      case "damage_adjustment":
        return { label: "Damage Write-off", variant: "danger" as const };
      case "manual_audit":
        return { label: "Physical Count Audit", variant: "warning" as const };
      default:
        return { label: reason, variant: "neutral" as const };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-neutral-200 shadow-2xl p-6 sm:p-8 animate-in fade-in-50 zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-mono">
                {item.sku}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-light tracking-tight text-neutral-950 uppercase">
              Inventory Ledger & Audit Trail
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

        {/* Content list */}
        <div className="mt-4 overflow-y-auto flex-1 pr-1 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Querying audit ledger entries...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              No historical ledger adjustments logged yet for this SKU.
            </div>
          ) : (
            <div className="border border-neutral-200 divide-y divide-neutral-100">
              {transactions.map((tx) => {
                const reasonInfo = formatReason(tx.reason);
                return (
                  <div key={tx.id} className="p-3.5 hover:bg-neutral-50 transition-colors text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={reasonInfo.variant} className="text-[9px] uppercase tracking-wider">
                          {reasonInfo.label}
                        </Badge>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {new Date(tx.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span
                          className={`font-bold ${
                            tx.changeQuantity > 0
                              ? "text-emerald-600"
                              : tx.changeQuantity < 0
                              ? "text-red-600"
                              : "text-neutral-500"
                          }`}
                        >
                          {tx.changeQuantity > 0 ? `+${tx.changeQuantity}` : tx.changeQuantity}
                        </span>
                        <ArrowRight className="w-3 h-3 text-neutral-400" />
                        <span className="font-semibold text-neutral-900">
                          {tx.resultingQuantity} on hand
                        </span>
                      </div>
                    </div>

                    {tx.notes && (
                      <p className="mt-1.5 text-neutral-600 italic text-[11px] bg-neutral-100/60 p-1.5 border-l-2 border-neutral-300">
                        &quot;{tx.notes}&quot;
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-400">
                      <span>Operator: {tx.performedByName || "System"}</span>
                      {tx.orderId && (
                        <span className="font-mono">Order Ref: {tx.orderId}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-200 mt-4 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-neutral-400">
            Ledger adjustments are tamper-evident and permanently recorded.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white text-xs uppercase tracking-wider hover:bg-neutral-800 transition-colors"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
