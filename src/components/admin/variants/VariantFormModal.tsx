"use client";

import * as React from "react";
import Image from "next/image";
import {
  X,
  Save,
  AlertCircle,
  Sparkles,
  Shield,
  Layers,
  Image as ImageIcon,
  Plus,
  Check,
} from "lucide-react";
import { ProductVariant, Attribute, ProductMedia } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createVariantAction,
  updateVariantAction,
  createAttributeValueAction,
} from "@/app/actions/variants";
import { buildCombinationHash, normalizeSku } from "@/lib/products/variant-utils";

interface VariantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  productBasePrice: number;
  assignedAttributes: Attribute[];
  productMedia: ProductMedia[];
  variantToEdit?: ProductVariant | null;
  existingVariants: ProductVariant[];
  onSuccess: () => void;
}

export function VariantFormModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  productBasePrice,
  assignedAttributes,
  productMedia,
  variantToEdit,
  existingVariants,
  onSuccess,
}: VariantFormModalProps) {
  const isEditing = Boolean(variantToEdit);

  // Form states
  const [selectedAttributes, setSelectedAttributes] = React.useState<Record<string, string>>({});
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [priceOverride, setPriceOverride] = React.useState("");
  const [compareAtPrice, setCompareAtPrice] = React.useState("");
  const [costPrice, setCostPrice] = React.useState("");
  const [weightGrams, setWeightGrams] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [selectedImageUrls, setSelectedImageUrls] = React.useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = React.useState("");

  // Inline attribute value creation
  const [addingValueForAttrId, setAddingValueForAttrId] = React.useState<string | null>(null);
  const [newValueText, setNewValueText] = React.useState("");
  const [newLabelText, setNewLabelText] = React.useState("");
  const [newColorHex, setNewColorHex] = React.useState("#000000");

  // Status & errors
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Initialize or reset form
  React.useEffect(() => {
    if (!isOpen) return;

    if (variantToEdit) {
      const stringAttrs: Record<string, string> = {};
      Object.entries(variantToEdit.attributes || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          stringAttrs[k] = String(v);
        }
      });
      setSelectedAttributes(stringAttrs);
      setSku(variantToEdit.sku);
      setBarcode(variantToEdit.barcode || "");
      setTitle(variantToEdit.title);
      setPriceOverride(
        variantToEdit.priceOverride !== null && variantToEdit.priceOverride !== undefined
          ? String(variantToEdit.priceOverride)
          : ""
      );
      setCompareAtPrice(
        variantToEdit.compareAtPrice !== null && variantToEdit.compareAtPrice !== undefined
          ? String(variantToEdit.compareAtPrice)
          : ""
      );
      setCostPrice(
        variantToEdit.costPrice !== null && variantToEdit.costPrice !== undefined
          ? String(variantToEdit.costPrice)
          : ""
      );
      setWeightGrams(
        variantToEdit.weightGrams !== null && variantToEdit.weightGrams !== undefined
          ? String(variantToEdit.weightGrams)
          : ""
      );
      setIsActive(variantToEdit.isActive);
      setSelectedImageUrls(variantToEdit.images || []);
    } else {
      // Default to first values of assigned attributes if available
      const defaults: Record<string, string> = {};
      assignedAttributes.forEach((attr) => {
        if (attr.values && attr.values.length > 0) {
          defaults[attr.code] = attr.values[0].value;
        }
      });
      setSelectedAttributes(defaults);
      setSku("");
      setBarcode("");
      setTitle("");
      setPriceOverride("");
      setCompareAtPrice("");
      setCostPrice("");
      setWeightGrams("");
      setIsActive(true);
      setSelectedImageUrls([]);
    }
    setErrorMsg(null);
  }, [isOpen, variantToEdit, assignedAttributes]);

  // Real-time combination hash & title calculation
  const currentCombinationHash = React.useMemo(() => {
    return buildCombinationHash(selectedAttributes);
  }, [selectedAttributes]);

  // Check duplicate combination
  const duplicateWarning = React.useMemo(() => {
    if (!currentCombinationHash) return null;
    const found = existingVariants.find(
      (v) =>
        v.combinationHash === currentCombinationHash &&
        !v.deletedAt &&
        (!variantToEdit || v.id !== variantToEdit.id)
    );
    if (found) {
      return `A variant with this combination already exists (SKU: ${found.sku}).`;
    }
    return null;
  }, [currentCombinationHash, existingVariants, variantToEdit]);

  // Auto-generate title & SKU suggestion if empty
  const handleAutoGenerateSku = () => {
    const brandPrefix = productTitle
      .replace(/[^A-Za-z0-9]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.substring(0, 3).toUpperCase())
      .join("-");

    const optionParts = Object.values(selectedAttributes)
      .map((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
      .join("-");

    const suggested = `${brandPrefix}-${optionParts}`;
    setSku(normalizeSku(suggested));
  };

  const handleAttributeChange = (code: string, value: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [code]: value,
    }));
  };

  const handleToggleImage = (url: string) => {
    setSelectedImageUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const handleAddCustomImage = () => {
    if (!customImageUrl.trim()) return;
    if (!selectedImageUrls.includes(customImageUrl.trim())) {
      setSelectedImageUrls((prev) => [...prev, customImageUrl.trim()]);
    }
    setCustomImageUrl("");
  };

  const handleCreateNewValue = async (attributeId: string) => {
    if (!newValueText.trim()) return;
    try {
      const res = await createAttributeValueAction({
        attributeId,
        value: newValueText.trim().toLowerCase().replace(/\s+/g, "-"),
        label: newLabelText.trim() || newValueText.trim(),
        colorHex: newColorHex || null,
        sortOrder: 99,
      });
      if (res.success && res.data) {
        const val = res.data as { value: string; attributeId: string };
        const attr = assignedAttributes.find((a) => a.id === attributeId);
        if (attr) {
          handleAttributeChange(attr.code, val.value);
        }
        setAddingValueForAttrId(null);
        setNewValueText("");
        setNewLabelText("");
      }
    } catch (err) {
      console.error("Failed to add attribute value:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (Object.keys(selectedAttributes).length === 0) {
      setErrorMsg("Please select options for this variant.");
      return;
    }

    if (!sku.trim()) {
      setErrorMsg("SKU is required.");
      return;
    }

    if (duplicateWarning) {
      setErrorMsg(duplicateWarning);
      return;
    }

    setLoading(true);

    try {
      // Auto-compute human title if blank
      const computedTitle =
        title.trim() ||
        Object.entries(selectedAttributes)
          .map(([k, val]) => {
            const attr = assignedAttributes.find((a) => a.code === k);
            const valObj = attr?.values?.find((v) => v.value === val);
            return valObj?.label || val;
          })
          .join(" / ");

      if (isEditing && variantToEdit) {
        const res = await updateVariantAction({
          id: variantToEdit.id,
          productId,
          sku: normalizeSku(sku),
          barcode: barcode.trim() || null,
          title: computedTitle,
          priceOverride: priceOverride ? parseFloat(priceOverride) : null,
          compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
          costPrice: costPrice ? parseFloat(costPrice) : null,
          weightGrams: weightGrams ? parseInt(weightGrams, 10) : null,
          isActive,
          attributes: selectedAttributes,
          mediaUrls: selectedImageUrls,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to update variant");
          setLoading(false);
          return;
        }
      } else {
        const res = await createVariantAction({
          productId,
          sku: normalizeSku(sku),
          barcode: barcode.trim() || null,
          title: computedTitle,
          priceOverride: priceOverride ? parseFloat(priceOverride) : null,
          compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
          costPrice: costPrice ? parseFloat(costPrice) : null,
          weightGrams: weightGrams ? parseInt(weightGrams, 10) : null,
          isActive,
          attributes: selectedAttributes,
          mediaUrls: selectedImageUrls,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to create variant");
          setLoading(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Variant submit error:", err);
      setErrorMsg(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      id="variant-form-modal-overlay"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/70">
          <div>
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-stone-600" />
              {isEditing ? `Edit Variant: ${variantToEdit?.sku}` : "Add Product Variant"}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Product: <span className="font-medium text-stone-700">{productTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Duplicate Combination Detected</p>
                <p className="mt-0.5">{duplicateWarning}</p>
              </div>
            </div>
          )}

          {/* 1. Attribute Selectors */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
              Variant Options & Attributes
            </label>

            {assignedAttributes.length === 0 ? (
              <div className="p-3 bg-stone-50 border border-dashed border-stone-300 rounded-lg text-xs text-stone-600">
                <p className="font-medium">No attributes assigned to this product yet.</p>
                <p className="text-stone-400 mt-0.5">
                  Go to the &quot;Attributes & Options&quot; tab to enable attributes (e.g. Size, Color, Fit).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assignedAttributes.map((attr) => {
                  const currentValue = selectedAttributes[attr.code] || "";
                  const isAddingValue = addingValueForAttrId === attr.id;

                  return (
                    <div
                      key={attr.id}
                      className="p-3 rounded-lg border border-stone-200 bg-stone-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-stone-800">
                          {attr.name}
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setAddingValueForAttrId(isAddingValue ? null : attr.id)
                          }
                          className="text-[11px] text-stone-500 hover:text-stone-900 flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add new
                        </button>
                      </div>

                      {/* Select or Button Options */}
                      {attr.type === "color_swatch" ? (
                        <div className="flex flex-wrap gap-1.5">
                          {attr.values?.map((val) => {
                            const isSelected = currentValue === val.value;
                            return (
                              <button
                                key={val.id}
                                type="button"
                                onClick={() => handleAttributeChange(attr.code, val.value)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                                  isSelected
                                    ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                                }`}
                              >
                                {val.colorHex && (
                                  <span
                                    className="w-3 h-3 rounded-full border border-stone-300 inline-block"
                                    style={{ backgroundColor: val.colorHex }}
                                  />
                                )}
                                {val.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <select
                          value={currentValue}
                          onChange={(e) => handleAttributeChange(attr.code, e.target.value)}
                          className="w-full text-xs bg-white border border-stone-200 rounded-md p-2 focus:ring-1 focus:ring-stone-900 focus:outline-hidden"
                        >
                          <option value="">-- Select {attr.name} --</option>
                          {attr.values?.map((val) => (
                            <option key={val.id} value={val.value}>
                              {val.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Quick inline value creation */}
                      {isAddingValue && (
                        <div className="pt-2 border-t border-stone-200 space-y-1.5">
                          <Input
                            placeholder="Option value (e.g. 43, XL, Khaki)"
                            value={newValueText}
                            onChange={(e) => setNewValueText(e.target.value)}
                            className="h-7 text-xs bg-white"
                          />
                          {attr.type === "color_swatch" && (
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={newColorHex}
                                onChange={(e) => setNewColorHex(e.target.value)}
                                className="w-7 h-7 rounded border border-stone-200 cursor-pointer"
                              />
                              <span className="text-[10px] text-stone-500 font-mono">
                                {newColorHex}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() => setAddingValueForAttrId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() => handleCreateNewValue(attr.id)}
                            >
                              Save Option
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. SKU and Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-800">
                  SKU (Stock Keeping Unit) <span className="text-rose-500">*</span>
                </label>
                {!sku && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateSku}
                    className="text-[11px] text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" /> Auto-suggest
                  </button>
                )}
              </div>
              <Input
                id="variant-sku-input"
                placeholder="e.g. OXF-COG-41"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="font-mono text-xs uppercase"
                required
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Must be globally unique across all products.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Barcode / UPC / EAN (Optional)
              </label>
              <Input
                id="variant-barcode-input"
                placeholder="e.g. 840001002"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Used for optical scanning and physical fulfillment.
              </p>
            </div>
          </div>

          {/* 3. Pricing Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-stone-50/70 border border-stone-200 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-stone-800 mb-1">
                Price Override ($)
              </label>
              <Input
                id="variant-price-override-input"
                type="number"
                step="0.01"
                min="0"
                placeholder={`Inherit: $${productBasePrice.toFixed(2)}`}
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                className="h-8 text-xs bg-white"
              />
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Leave empty to inherit ${productBasePrice.toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-800 mb-1">
                Compare-At Price ($)
              </label>
              <Input
                id="variant-compare-price-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 350.00"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="h-8 text-xs bg-white"
              />
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Original MSRP for sale badge
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-800 mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-stone-400" /> Cost Price ($)
              </label>
              <Input
                id="variant-cost-price-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 110.00"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="h-8 text-xs bg-white"
              />
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Admin only (hidden from store)
              </span>
            </div>
          </div>

          {/* 4. Weight & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-800 mb-1">
                Weight in Grams (Optional)
              </label>
              <Input
                id="variant-weight-input"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 950"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 border border-stone-200 rounded-lg bg-stone-50/50 mt-1">
              <div>
                <span className="text-xs font-semibold text-stone-800 block">
                  Variant Status
                </span>
                <span className="text-[11px] text-stone-500">
                  {isActive ? "Active and available for purchase" : "Inactive (hidden from customer)"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-stone-300 text-stone-700"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          {/* 5. Variant Media Association */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Variant Images
            </label>
            <p className="text-[11px] text-stone-400">
              Select product images specific to this variant, or add a variant image URL.
            </p>

            {productMedia.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                {productMedia.map((m) => {
                  const isSelected = selectedImageUrls.includes(m.url);
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleToggleImage(m.url)}
                      className={`relative aspect-square rounded-md overflow-hidden border cursor-pointer group transition-all ${
                        isSelected
                          ? "ring-2 ring-stone-900 border-transparent shadow-xs"
                          : "border-stone-200 hover:border-stone-400 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={m.url}
                        alt="Product Media"
                        fill
                        className="object-cover"
                        sizes="80px"
                        referrerPolicy="no-referrer"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-stone-900 text-white rounded-full p-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Or paste a variant-specific image URL..."
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomImage}
                disabled={!customImageUrl.trim()}
                className="text-xs whitespace-nowrap"
              >
                Add Image
              </Button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              id="save-variant-btn"
              type="submit"
              disabled={loading || Boolean(duplicateWarning)}
              className="text-xs bg-stone-900 text-white hover:bg-stone-800"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {isEditing ? "Update Variant" : "Create Variant"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
