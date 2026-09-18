"use client";

import * as React from "react";
import {
  Layers,
  Plus,
  Sparkles,
  SlidersHorizontal,
  Package,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Product, ProductVariant, Attribute, ProductMedia } from "@/types";
import { Button } from "@/components/ui/Button";
import { VariantTable } from "./VariantTable";
import { VariantFormModal } from "./VariantFormModal";
import { GenerateVariantsModal } from "./GenerateVariantsModal";
import {
  getVariantsByProductAction,
  archiveVariantAction,
  restoreVariantAction,
} from "@/app/actions/variants";

interface ProductVariantsTabProps {
  product: Product;
  assignedAttributes: Attribute[];
  onNavigateToAttributesTab?: () => void;
  onRefreshProduct: () => void;
}

export function ProductVariantsTab({
  product,
  assignedAttributes,
  onNavigateToAttributesTab,
  onRefreshProduct,
}: ProductVariantsTabProps) {
  const [variants, setVariants] = React.useState<ProductVariant[]>(product.variants || []);
  const [loading, setLoading] = React.useState(false);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [editingVariant, setEditingVariant] = React.useState<ProductVariant | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);

  // Refresh variants list
  const onRefreshProductRef = React.useRef(onRefreshProduct);
  onRefreshProductRef.current = onRefreshProduct;

  const refreshVariants = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVariantsByProductAction(product.id, { includeArchived: true });
      if (res.success && res.data) {
        setVariants(res.data as ProductVariant[]);
      }
      onRefreshProductRef.current?.();
    } catch (err) {
      console.error("Refresh variants error:", err);
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  React.useEffect(() => {
    if (product.variants) {
      setVariants(product.variants);
    }
  }, [product.variants]);

  const handleOpenCreateModal = () => {
    setEditingVariant(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setIsFormModalOpen(true);
  };

  const handleArchive = async (variant: ProductVariant) => {
    let confirmed = true;
    try {
      confirmed = window.confirm(`Are you sure you want to archive variant ${variant.sku}?`);
    } catch {
      confirmed = true;
    }
    if (!confirmed) return;

    try {
      const res = await archiveVariantAction(variant.id, product.id);
      if (res.success) {
        refreshVariants();
      }
    } catch (err) {
      console.error("Archive variant error:", err);
    }
  };

  const handleRestore = async (variant: ProductVariant) => {
    try {
      const res = await restoreVariantAction(variant.id, product.id);
      if (res.success) {
        refreshVariants();
      }
    } catch (err) {
      console.error("Restore variant error:", err);
    }
  };

  // Metrics
  const activeVariantsCount = variants.filter((v) => v.isActive && !v.deletedAt).length;
  const priceOverriddenCount = variants.filter(
    (v) => v.priceOverride !== null && v.priceOverride !== undefined
  ).length;

  return (
    <div className="space-y-5" id="product-variants-tab-content">
      {/* Top Header & Quick Metrics */}
      <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-stone-700" />
            Variants for {product.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-stone-500">
            <span>
              Total Variants: <strong className="text-stone-800">{variants.length}</strong>
            </span>
            <span>•</span>
            <span>
              Active: <strong className="text-emerald-700">{activeVariantsCount}</strong>
            </span>
            <span>•</span>
            <span>
              Price Overrides: <strong className="text-amber-700">{priceOverriddenCount}</strong>
            </span>
            <span>•</span>
            <span>
              Base Price:{" "}
              <strong className="text-stone-800">${product.basePrice.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            id="open-generate-variants-btn"
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsGenerateModalOpen(true)}
            className="text-xs h-8 border-stone-300 hover:bg-stone-100"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Generate Variants
          </Button>

          <Button
            id="open-add-variant-btn"
            type="button"
            size="sm"
            onClick={handleOpenCreateModal}
            className="text-xs h-8 bg-stone-900 text-white hover:bg-stone-800"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Variant
          </Button>
        </div>
      </div>

      {/* Notice if no assigned attributes */}
      {assignedAttributes.length === 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start justify-between gap-3 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No Attributes Assigned</p>
              <p className="text-amber-700 mt-0.5">
                Assign attributes (like Size, Color, Fit) to enable structured option selectors and automated variant matrix generation.
              </p>
            </div>
          </div>
          {onNavigateToAttributesTab && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNavigateToAttributesTab}
              className="h-7 text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100 shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3 mr-1" /> Configure Attributes
            </Button>
          )}
        </div>
      )}

      {/* Main Content: Table or Empty State */}
      {variants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <Package className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-sm font-semibold text-stone-900">
              No Variants Created Yet
            </h4>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              This product is currently functioning without variants (a single standalone product).
              You can add variants manually or generate combinations from attributes.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsGenerateModalOpen(true)}
              className="text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Generate from Attributes
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreateModal}
              className="text-xs bg-stone-900 text-white hover:bg-stone-800"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add First Variant
            </Button>
          </div>
        </div>
      ) : (
        <VariantTable
          variants={variants}
          productBasePrice={product.basePrice}
          assignedAttributes={assignedAttributes}
          onEditVariant={handleOpenEditModal}
          onArchiveVariant={handleArchive}
          onRestoreVariant={handleRestore}
          onRefresh={refreshVariants}
        />
      )}

      {/* Variant Form Modal (Add / Edit) */}
      <VariantFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        productId={product.id}
        productTitle={product.title}
        productBasePrice={product.basePrice}
        assignedAttributes={assignedAttributes}
        productMedia={product.media || []}
        variantToEdit={editingVariant}
        existingVariants={variants}
        onSuccess={refreshVariants}
      />

      {/* Generate Variants Modal */}
      <GenerateVariantsModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        productId={product.id}
        productTitle={product.title}
        productBasePrice={product.basePrice}
        assignedAttributes={assignedAttributes}
        existingVariants={variants}
        onSuccess={refreshVariants}
      />
    </div>
  );
}
