"use client";

import * as React from "react";
import Image from "next/image";
import {
  Copy,
  Check,
  Edit2,
  Archive,
  RotateCcw,
  Sparkles,
  Package,
  Layers,
  Search,
  Filter,
  AlertCircle,
} from "lucide-react";
import { ProductVariant, Attribute } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toggleVariantStatusAction } from "@/app/actions/variants";

interface VariantTableProps {
  variants: ProductVariant[];
  productBasePrice: number;
  assignedAttributes: Attribute[];
  onEditVariant: (variant: ProductVariant) => void;
  onArchiveVariant: (variant: ProductVariant) => void;
  onRestoreVariant: (variant: ProductVariant) => void;
  onRefresh: () => void;
}

export function VariantTable({
  variants,
  productBasePrice,
  assignedAttributes,
  onEditVariant,
  onArchiveVariant,
  onRestoreVariant,
  onRefresh,
}: VariantTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive" | "archived">("all");
  const [copiedSku, setCopiedSku] = React.useState<string | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleToggleStatus = async (variant: ProductVariant) => {
    if (variant.deletedAt) return;
    setTogglingId(variant.id);
    try {
      const res = await toggleVariantStatusAction(variant.id, !variant.isActive, variant.productId);
      if (res.success) {
        onRefresh();
      }
    } catch (err) {
      console.error("Toggle variant status error:", err);
    } finally {
      setTogglingId(null);
    }
  };

  // Filter variants
  const filteredVariants = React.useMemo(() => {
    return variants.filter((v) => {
      // Status filter
      if (statusFilter === "active" && (!v.isActive || v.deletedAt)) return false;
      if (statusFilter === "inactive" && (v.isActive || v.deletedAt)) return false;
      if (statusFilter === "archived" && !v.deletedAt) return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesSku = v.sku.toLowerCase().includes(q);
        const matchesTitle = v.title.toLowerCase().includes(q);
        const matchesBarcode = v.barcode ? v.barcode.toLowerCase().includes(q) : false;
        const matchesAttrs = Object.entries(v.attributes).some(
          ([k, val]) => k.toLowerCase().includes(q) || String(val).toLowerCase().includes(q)
        );
        return matchesSku || matchesTitle || matchesBarcode || matchesAttrs;
      }

      return true;
    });
  }, [variants, statusFilter, searchTerm]);

  return (
    <div className="space-y-3" id="variant-management-table-container">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center bg-stone-50/80 p-2.5 rounded-lg border border-stone-200/70">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            id="variant-table-search-input"
            type="text"
            placeholder="Search by SKU, size, color..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className="text-[11px] font-medium text-stone-500 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {(["all", "active", "inactive", "archived"] as const).map((status) => {
            const count =
              status === "all"
                ? variants.length
                : status === "archived"
                ? variants.filter((v) => v.deletedAt).length
                : status === "active"
                ? variants.filter((v) => v.isActive && !v.deletedAt).length
                : variants.filter((v) => !v.isActive && !v.deletedAt).length;

            return (
              <button
                key={status}
                type="button"
                id={`filter-variant-${status}-btn`}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap font-medium ${
                  statusFilter === status
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}{" "}
                <span
                  className={`text-[10px] ml-1 px-1 py-0.2 rounded-full ${
                    statusFilter === status
                      ? "bg-stone-700 text-stone-200"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold tracking-wide uppercase text-[10px]">
              <th className="py-2.5 px-3 w-12 text-center">Image</th>
              <th className="py-2.5 px-3">SKU</th>
              <th className="py-2.5 px-3">Options / Attributes</th>
              <th className="py-2.5 px-3">Price</th>
              <th className="py-2.5 px-3">Inventory</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredVariants.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Package className="w-6 h-6 text-stone-300" />
                    <p className="text-sm font-medium text-stone-600">No matching variants found</p>
                    <p className="text-xs text-stone-400">
                      {searchTerm ? "Try adjusting your search query or filter" : "No variants match the selected criteria"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVariants.map((variant) => {
                const isArchived = Boolean(variant.deletedAt);
                const hasPriceOverride =
                  variant.priceOverride !== null &&
                  variant.priceOverride !== undefined;
                const displayPrice = hasPriceOverride
                  ? Number(variant.priceOverride)
                  : productBasePrice;

                // Pick primary image or first available
                const thumbUrl =
                  variant.images?.[0] ||
                  variant.media?.[0]?.url ||
                  null;

                return (
                  <tr
                    key={variant.id}
                    id={`variant-row-${variant.id}`}
                    className={`hover:bg-stone-50/60 transition-colors ${
                      isArchived ? "bg-stone-50/40 opacity-75" : ""
                    }`}
                  >
                    {/* 1. Image Thumbnail */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-9 h-9 rounded-md bg-stone-100 border border-stone-200 overflow-hidden relative mx-auto flex items-center justify-center">
                        {thumbUrl ? (
                          <Image
                            src={thumbUrl}
                            alt={variant.title}
                            fill
                            className="object-cover"
                            sizes="36px"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-stone-400" />
                        )}
                      </div>
                    </td>

                    {/* 2. SKU */}
                    <td className="py-2.5 px-3 font-mono font-medium text-stone-900">
                      <div className="flex items-center gap-1.5 group">
                        <span className="select-all">{variant.sku}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySku(variant.sku)}
                          title="Copy SKU"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-stone-400 hover:text-stone-700 rounded"
                        >
                          {copiedSku === variant.sku ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {variant.barcode && (
                        <span className="block text-[10px] text-stone-400 font-sans mt-0.5">
                          UPC: {variant.barcode}
                        </span>
                      )}
                    </td>

                    {/* 3. Options / Attributes */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {Object.entries(variant.attributes).map(([attrKey, attrVal]) => {
                          const matchedAttr = assignedAttributes.find(
                            (a) => a.code.toLowerCase() === attrKey.toLowerCase()
                          );
                          const matchedVal = (matchedAttr?.values || []).find(
                            (v) =>
                              v.value.toLowerCase() === String(attrVal).toLowerCase()
                          );

                          return (
                            <span
                              key={attrKey}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 border border-stone-200 text-stone-800 rounded text-[11px] font-medium"
                            >
                              {matchedVal?.colorHex && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-stone-300 inline-block shadow-2xs"
                                  style={{ backgroundColor: matchedVal.colorHex }}
                                />
                              )}
                              <span className="text-stone-500 font-normal">
                                {matchedAttr?.name || attrKey}:
                              </span>{" "}
                              <span>{matchedVal?.label || String(attrVal)}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* 4. Price & Inheritance */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-medium text-stone-900">
                          <span>${displayPrice.toFixed(2)}</span>
                          {variant.compareAtPrice && (
                            <span className="text-[10px] text-stone-400 line-through">
                              ${Number(variant.compareAtPrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {hasPriceOverride ? (
                          <span className="inline-flex items-center text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200/60 w-fit mt-0.5">
                            Override
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-normal text-stone-500 bg-stone-100 px-1 rounded w-fit mt-0.5">
                            Inherited
                          </span>
                        )}
                        {variant.costPrice && (
                          <span className="text-[9px] text-stone-400 mt-0.5">
                            Cost: ${Number(variant.costPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Inventory Summary (Phase 8 preparation) */}
                    <td className="py-2.5 px-3">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            (variant.stockQuantity ?? 0) > 5
                              ? "bg-emerald-500"
                              : (variant.stockQuantity ?? 0) > 0
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                        <span className="font-medium text-stone-700">
                          {variant.stockQuantity !== undefined
                            ? `${variant.stockQuantity} in stock`
                            : "0 in stock"}
                        </span>
                      </div>
                    </td>

                    {/* 6. Status & Quick Toggle */}
                    <td className="py-2.5 px-3">
                      {isArchived ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                          Archived
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            id={`toggle-variant-${variant.id}-btn`}
                            onClick={() => handleToggleStatus(variant)}
                            disabled={togglingId === variant.id}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                              variant.isActive
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300/50"
                                : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                            }`}
                          >
                            {variant.isActive ? "Active" : "Inactive"}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 7. Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          id={`edit-variant-${variant.id}-btn`}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEditVariant(variant)}
                          className="h-7 px-2 text-xs"
                          title="Edit Variant"
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>

                        {isArchived ? (
                          <Button
                            id={`restore-variant-${variant.id}-btn`}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRestoreVariant(variant)}
                            className="h-7 px-2 text-xs text-stone-600 hover:text-stone-900"
                            title="Restore Variant"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" /> Restore
                          </Button>
                        ) : (
                          <Button
                            id={`archive-variant-${variant.id}-btn`}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onArchiveVariant(variant)}
                            className="h-7 px-2 text-xs text-stone-500 hover:text-amber-700"
                            title="Archive Variant"
                          >
                            <Archive className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
