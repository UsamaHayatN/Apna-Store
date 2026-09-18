"use client";

import * as React from "react";
import {
  SlidersHorizontal,
  Check,
  Plus,
  Save,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
} from "lucide-react";
import { Attribute } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  updateProductAttributesAction,
  createAttributeAction,
  createAttributeValueAction,
  getAllAttributesAction,
} from "@/app/actions/variants";

interface ProductAttributesTabProps {
  productId: string;
  productTitle: string;
  assignedAttributes: Attribute[];
  allAttributes: Attribute[];
  onAttributesUpdated: () => void;
}

export function ProductAttributesTab({
  productId,
  productTitle,
  assignedAttributes,
  allAttributes: initialAllAttributes,
  onAttributesUpdated,
}: ProductAttributesTabProps) {
  const [allAttributes, setAllAttributes] = React.useState<Attribute[]>(initialAllAttributes);
  const [selectedAttributeIds, setSelectedAttributeIds] = React.useState<string[]>(
    assignedAttributes.map((a) => a.id)
  );

  // New attribute form state
  const [isCreatingAttribute, setIsCreatingAttribute] = React.useState(false);
  const [newAttrName, setNewAttrName] = React.useState("");
  const [newAttrCode, setNewAttrCode] = React.useState("");
  const [newAttrType, setNewAttrType] = React.useState<"select" | "color_swatch" | "button_pill">("button_pill");

  // Inline value adding
  const [addingValueForAttrId, setAddingValueForAttrId] = React.useState<string | null>(null);
  const [newValueText, setNewValueText] = React.useState("");
  const [newLabelText, setNewLabelText] = React.useState("");
  const [newColorHex, setNewColorHex] = React.useState("#000000");

  const [saving, setSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Sync assigned attribute IDs when props change
  React.useEffect(() => {
    setSelectedAttributeIds(assignedAttributes.map((a) => a.id));
  }, [assignedAttributes]);

  const handleToggleAttribute = (attributeId: string) => {
    setSelectedAttributeIds((prev) =>
      prev.includes(attributeId)
        ? prev.filter((id) => id !== attributeId)
        : [...prev, attributeId]
    );
    setSuccessMsg(null);
  };

  const handleSaveAttributes = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await updateProductAttributesAction({
        productId,
        attributeIds: selectedAttributeIds,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to update product attributes");
        return;
      }

      setSuccessMsg("Product attributes successfully updated!");
      onAttributesUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Save attributes error:", err);
      setErrorMsg("Failed to save attributes");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrName.trim()) return;

    try {
      const generatedCode =
        newAttrCode.trim().toLowerCase().replace(/\s+/g, "_") ||
        newAttrName.trim().toLowerCase().replace(/\s+/g, "_");

      const res = await createAttributeAction({
        name: newAttrName.trim(),
        code: generatedCode,
        type: newAttrType,
        displayOrder: 0,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create attribute");
        return;
      }

      if (res.data) {
        const created = res.data as Attribute;
        setAllAttributes((prev) => [...prev, created]);
        setSelectedAttributeIds((prev) => [...prev, created.id]);
        setIsCreatingAttribute(false);
        setNewAttrName("");
        setNewAttrCode("");
      }
    } catch (err) {
      console.error("Create attribute error:", err);
    }
  };

  const handleAddValueToAttribute = async (attrId: string) => {
    if (!newValueText.trim()) return;
    try {
      const res = await createAttributeValueAction({
        attributeId: attrId,
        value: newValueText.trim().toLowerCase().replace(/\s+/g, "-"),
        label: newLabelText.trim() || newValueText.trim(),
        colorHex: newColorHex || null,
        sortOrder: 99,
      });

      if (res.success) {
        // Refresh all attributes
        const fresh = await getAllAttributesAction();
        if (fresh.success && fresh.data) {
          setAllAttributes(fresh.data as Attribute[]);
        }
        setAddingValueForAttrId(null);
        setNewValueText("");
        setNewLabelText("");
      }
    } catch (err) {
      console.error("Add attribute value error:", err);
    }
  };

  return (
    <div className="space-y-6" id="product-attributes-tab-content">
      {/* Top Banner & Context */}
      <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-stone-600" />
            Configured Attributes for {productTitle}
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Choose which attributes (e.g. Size, Color, Waist, Fit) are applicable to this specific product.
            Variants for this product will be created using combinations of these assigned attributes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingAttribute(true)}
            className="text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> New Custom Attribute
          </Button>

          <Button
            id="save-attributes-btn"
            type="button"
            size="sm"
            onClick={handleSaveAttributes}
            disabled={saving}
            className="text-xs h-8 bg-stone-900 text-white hover:bg-stone-800"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" /> {errorMsg}
        </div>
      )}

      {/* New Attribute Modal / Form */}
      {isCreatingAttribute && (
        <div className="p-4 bg-white border border-stone-300 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h4 className="text-xs font-semibold text-stone-900">
              Create New System Attribute
            </h4>
            <button
              type="button"
              onClick={() => setIsCreatingAttribute(false)}
              className="text-stone-400 hover:text-stone-600 text-xs"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleCreateAttribute} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Display Name
              </label>
              <Input
                placeholder="e.g. Waist Size, Collar Type"
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                className="text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Internal Code (Optional)
              </label>
              <Input
                placeholder="e.g. waist_size"
                value={newAttrCode}
                onChange={(e) => setNewAttrCode(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                UI Display Type
              </label>
              <select
                value={newAttrType}
                onChange={(e) =>
                  setNewAttrType(e.target.value as "select" | "color_swatch" | "button_pill")
                }
                className="w-full text-xs border border-stone-200 rounded-md p-2 bg-white"
              >
                <option value="button_pill">Button Pill (e.g. 41, 42, S, M)</option>
                <option value="color_swatch">Color Swatch (Visual Palette)</option>
                <option value="select">Dropdown Select</option>
              </select>
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setIsCreatingAttribute(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs bg-stone-900 text-white">
                Save & Assign
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Available Attributes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allAttributes.map((attr) => {
          const isAssigned = selectedAttributeIds.includes(attr.id);
          const isAddingValue = addingValueForAttrId === attr.id;

          return (
            <div
              key={attr.id}
              className={`rounded-xl border p-4 transition-all ${
                isAssigned
                  ? "bg-white border-stone-900 ring-1 ring-stone-900/10 shadow-xs"
                  : "bg-stone-50/50 border-stone-200 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggleAttribute(attr.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                      isAssigned
                        ? "bg-stone-900 border-stone-900 text-white"
                        : "border-stone-300 bg-white hover:border-stone-500"
                    }`}
                  >
                    {isAssigned && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                      {attr.name}
                      <span className="text-[10px] font-mono text-stone-400 font-normal">
                        ({attr.code})
                      </span>
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      UI Type: {attr.type.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAddingValueForAttrId(isAddingValue ? null : attr.id)
                  }
                  className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md hover:bg-stone-200"
                >
                  <Plus className="w-3 h-3" /> Add Value
                </button>
              </div>

              {/* Inline Value Adder */}
              {isAddingValue && (
                <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Value code (e.g. 43, navy)"
                      value={newValueText}
                      onChange={(e) => setNewValueText(e.target.value)}
                      className="text-xs h-7 bg-white"
                    />
                    <Input
                      placeholder="Display Label (e.g. EU 43, Navy Blue)"
                      value={newLabelText}
                      onChange={(e) => setNewLabelText(e.target.value)}
                      className="text-xs h-7 bg-white"
                    />
                  </div>
                  {attr.type === "color_swatch" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-stone-600">
                        Color: {newColorHex}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-end gap-1.5">
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
                      className="h-6 text-[10px] bg-stone-900 text-white"
                      onClick={() => handleAddValueToAttribute(attr.id)}
                    >
                      Save Option Value
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing Values Badges */}
              <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-1.5">
                {attr.values && attr.values.length > 0 ? (
                  attr.values.map((v) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/80 text-[11px] text-stone-700 font-medium"
                    >
                      {v.colorHex && (
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-stone-300 inline-block"
                          style={{ backgroundColor: v.colorHex }}
                        />
                      )}
                      {v.label}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-stone-400 italic">
                    No predefined values yet. Click &quot;Add Value&quot; to add some.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
