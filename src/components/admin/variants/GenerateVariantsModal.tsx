"use client";

import * as React from "react";
import {
  X,
  Sparkles,
  Layers,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  PackageCheck,
} from "lucide-react";
import { Attribute, ProductVariant } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  previewGenerateVariantsAction,
  bulkCreateGeneratedVariantsAction,
} from "@/app/actions/variants";

interface GenerateVariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  productBasePrice: number;
  assignedAttributes: Attribute[];
  existingVariants: ProductVariant[];
  onSuccess: () => void;
}

interface CombinationPreviewItem {
  attributes: Record<string, string>;
  sku: string;
  title: string;
  combinationHash: string;
  priceOverride?: number | null;
  exists: boolean;
}

export function GenerateVariantsModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  productBasePrice,
  assignedAttributes,
  existingVariants,
  onSuccess,
}: GenerateVariantsModalProps) {
  // Step 1: Attribute Value Selection
  const [selectedAttributeValues, setSelectedAttributeValues] = React.useState<
    Record<string, string[]>
  >({});
  const [skuPrefix, setSkuPrefix] = React.useState("");
  const [priceOverride, setPriceOverride] = React.useState("");

  // Step 2: Preview Results
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [previewCombinations, setPreviewCombinations] = React.useState<CombinationPreviewItem[]>([]);
  const [selectedForCreation, setSelectedForCreation] = React.useState<Record<string, boolean>>({});

  // Status & loading
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Initialize selections
  React.useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, string[]> = {};
    assignedAttributes.forEach((attr) => {
      // By default select all existing values for convenience
      initial[attr.code] = (attr.values || []).map((v) => v.value);
    });
    setSelectedAttributeValues(initial);

    const defaultPrefix = productTitle
      .replace(/[^A-Za-z0-9]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.substring(0, 3).toUpperCase())
      .join("-");

    setSkuPrefix(defaultPrefix);
    setPriceOverride("");
    setPreviewCombinations([]);
    setSelectedForCreation({});
    setErrorMsg(null);
  }, [isOpen, assignedAttributes, productTitle]);

  const handleToggleValue = (attrCode: string, val: string) => {
    setSelectedAttributeValues((prev) => {
      const current = prev[attrCode] || [];
      const updated = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      return { ...prev, [attrCode]: updated };
    });
    // Invalidate preview if selection changes
    setPreviewCombinations([]);
  };

  const handleSelectAllForAttr = (attrCode: string, allVals: string[]) => {
    setSelectedAttributeValues((prev) => ({
      ...prev,
      [attrCode]: allVals,
    }));
    setPreviewCombinations([]);
  };

  const handleDeselectAllForAttr = (attrCode: string) => {
    setSelectedAttributeValues((prev) => ({
      ...prev,
      [attrCode]: [],
    }));
    setPreviewCombinations([]);
  };

  // Theoretical count calculation
  const totalCombinationsCount = React.useMemo(() => {
    const counts = Object.values(selectedAttributeValues).map((v) => v.length);
    if (counts.length === 0 || counts.some((c) => c === 0)) return 0;
    return counts.reduce((acc, curr) => acc * curr, 1);
  }, [selectedAttributeValues]);

  const handlePreview = async () => {
    setErrorMsg(null);
    if (totalCombinationsCount === 0) {
      setErrorMsg("Please select at least one value for each assigned attribute.");
      return;
    }

    setIsPreviewing(true);
    try {
      const res = await previewGenerateVariantsAction({
        productId,
        skuPrefix: skuPrefix.trim() || "VAR",
        attributeOptions: selectedAttributeValues,
        basePriceOverride: priceOverride ? parseFloat(priceOverride) : null,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to generate combinations preview");
        return;
      }

      if (!res.data) {
        setErrorMsg("Failed to generate combinations preview");
        return;
      }

      const combos = res.data as CombinationPreviewItem[];
      setPreviewCombinations(combos);

      // Pre-select all non-existing combinations
      const checked: Record<string, boolean> = {};
      combos.forEach((c) => {
        if (!c.exists) {
          checked[c.combinationHash] = true;
        }
      });
      setSelectedForCreation(checked);
    } catch (err) {
      console.error("Preview combinations error:", err);
      setErrorMsg("Failed to generate combination preview");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleToggleSelection = (hash: string) => {
    setSelectedForCreation((prev) => ({
      ...prev,
      [hash]: !prev[hash],
    }));
  };

  const handleBulkCreate = async () => {
    setErrorMsg(null);
    const selected = previewCombinations.filter((c) => selectedForCreation[c.combinationHash]);
    if (selected.length === 0) {
      setErrorMsg("No new combinations are selected for creation.");
      return;
    }

    setLoading(true);
    try {
      const res = await bulkCreateGeneratedVariantsAction(
        {
          productId,
          skuPrefix: skuPrefix.trim() || "VAR",
          attributeOptions: selectedAttributeValues,
          basePriceOverride: priceOverride ? parseFloat(priceOverride) : null,
        },
        selected.map((c) => ({
          attributes: c.attributes,
          sku: c.sku,
          title: c.title,
          priceOverride: c.priceOverride,
        }))
      );

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create variants");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Bulk create variants error:", err);
      setErrorMsg("Failed to create variants");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const newCombinationsCount = previewCombinations.filter((c) => !c.exists).length;
  const existingCombinationsCount = previewCombinations.filter((c) => c.exists).length;
  const selectedCount = Object.values(selectedForCreation).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      id="generate-variants-modal-overlay"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/70">
          <div>
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Generate Product Variants
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Automatically calculate cross-product combinations for{" "}
              <span className="font-medium text-stone-700">{productTitle}</span>
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

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Generator Notice</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Section 1: Choose Attribute Values */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center justify-between">
              <span>Step 1: Select Attribute Values for Generation</span>
              <span className="text-[11px] font-normal text-stone-400">
                Theoretical Matrix: <strong className="text-stone-800">{totalCombinationsCount}</strong> combinations
              </span>
            </h3>

            {assignedAttributes.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                This product does not have any assigned attributes yet. Please go to the &quot;Attributes & Options&quot; tab first to enable Size, Color, or custom attributes.
              </div>
            ) : (
              <div className="space-y-4">
                {assignedAttributes.map((attr) => {
                  const selectedVals = selectedAttributeValues[attr.code] || [];
                  const allValues = (attr.values || []).map((v) => v.value);

                  return (
                    <div
                      key={attr.id}
                      className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-900">
                          {attr.name}{" "}
                          <span className="font-normal text-stone-400">
                            ({selectedVals.length}/{allValues.length} selected)
                          </span>
                        </span>
                        <div className="flex gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleSelectAllForAttr(attr.code, allValues)}
                            className="text-stone-600 hover:text-stone-900"
                          >
                            Select All
                          </button>
                          <span className="text-stone-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleDeselectAllForAttr(attr.code)}
                            className="text-stone-400 hover:text-stone-700"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {attr.values?.map((val) => {
                          const isChecked = selectedVals.includes(val.value);
                          return (
                            <button
                              key={val.id}
                              type="button"
                              onClick={() => handleToggleValue(attr.code, val.value)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                                isChecked
                                  ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                              }`}
                            >
                              {val.colorHex && (
                                <span
                                  className="w-3 h-3 rounded-full border border-stone-300 inline-block"
                                  style={{ backgroundColor: val.colorHex }}
                                />
                              )}
                              <span>{val.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Generation Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-stone-50 border border-stone-200">
            <div>
              <label className="block text-xs font-medium text-stone-800 mb-1">
                SKU Prefix
              </label>
              <Input
                value={skuPrefix}
                onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. OXF-CLASSIC"
                className="font-mono text-xs uppercase bg-white"
              />
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Prefix appended to option codes (e.g. OXF-CLASSIC-41-BLK)
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-800 mb-1">
                Default Price Override ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                placeholder={`Inherit base: $${productBasePrice.toFixed(2)}`}
                className="text-xs bg-white"
              />
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Leave empty to inherit base price (${productBasePrice.toFixed(2)})
              </span>
            </div>
          </div>

          {/* Preview Trigger Button */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={isPreviewing || totalCombinationsCount === 0}
              className="text-xs px-6 border-stone-300 hover:bg-stone-100"
            >
              {isPreviewing ? (
                "Calculating Matrix..."
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  Preview Combinations ({totalCombinationsCount})
                </>
              )}
            </Button>
          </div>

          {/* Section 3: Preview Table & Conflict Analysis */}
          {previewCombinations.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-stone-900">
                    Matrix Combinations Analysis
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Total: <strong>{previewCombinations.length}</strong> | New:{" "}
                    <strong className="text-emerald-700">{newCombinationsCount}</strong> | Already
                    Exist: <strong className="text-amber-700">{existingCombinationsCount}</strong>
                  </p>
                </div>
                <div className="text-xs text-stone-600">
                  Ready to create: <strong className="text-stone-900">{selectedCount}</strong>
                </div>
              </div>

              <div className="border border-stone-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3 w-8">Create</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Options</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {previewCombinations.map((combo) => {
                      const isExisting = combo.exists;
                      const isSelected = selectedForCreation[combo.combinationHash];

                      return (
                        <tr
                          key={combo.combinationHash}
                          className={isExisting ? "bg-amber-50/40 text-stone-400" : "hover:bg-stone-50"}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={Boolean(isSelected)}
                              disabled={isExisting}
                              onChange={() => handleToggleSelection(combo.combinationHash)}
                              className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-stone-800">
                            {combo.sku}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1">
                              {Object.entries(combo.attributes).map(([k, val]) => (
                                <span
                                  key={k}
                                  className="px-1.5 py-0.5 bg-stone-100 rounded text-[10px] text-stone-700"
                                >
                                  {k}: {val}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {isExisting ? (
                              <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                                Already Exists (Skipped)
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> New to Create
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50/50">
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
            id="confirm-generate-variants-btn"
            type="button"
            onClick={handleBulkCreate}
            disabled={loading || selectedCount === 0}
            className="text-xs bg-stone-900 text-white hover:bg-stone-800"
          >
            {loading ? (
              "Generating Variants..."
            ) : (
              <>
                <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                Generate {selectedCount} Variants
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
