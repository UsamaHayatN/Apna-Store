"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Trash2,
  RotateCcw,
  Sparkles,
  Eye,
  Plus,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  SlidersHorizontal,
  ArrowUpRight,
  FolderTree,
} from "lucide-react";
import { Product, Category, ProductType, ProductStatus, Attribute, ProductVariant, Collection } from "@/types";
import { CreateProductInput, ProductMediaItemInput } from "@/lib/validation/product";
import { generateSlug } from "@/lib/utils/slug";
import {
  createProductAction,
  updateProductAction,
  archiveProductAction,
  restoreProductAction,
  toggleProductPublishAction,
} from "@/app/actions/products";
import {
  getProductAttributesAction,
  getVariantsByProductAction,
} from "@/app/actions/variants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { ArchiveConfirmModal } from "./ArchiveConfirmModal";
import { ProductVariantsTab } from "./variants/ProductVariantsTab";
import { ProductAttributesTab } from "./variants/ProductAttributesTab";

interface ProductFormProps {
  initialData?: Product | null;
  categories: Category[];
  productTypes: ProductType[];
  allAttributes?: Attribute[];
  mode: "create" | "edit";
}

export function ProductForm({
  initialData,
  categories,
  productTypes,
  allAttributes = [],
  mode,
}: ProductFormProps) {
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<"details" | "variants" | "attributes">("details");

  // Variants & Attributes state for edit mode
  const [variantsList, setVariantsList] = React.useState<ProductVariant[]>(
    initialData?.variants || []
  );
  const [assignedAttributesList, setAssignedAttributesList] = React.useState<Attribute[]>(
    initialData?.assignedAttributes || []
  );

  // Form states
  const [title, setTitle] = React.useState(initialData?.title || "");
  const [slug, setSlug] = React.useState(initialData?.slug || "");
  const [brand, setBrand] = React.useState(initialData?.brand || "Atelier Artisans");
  const [productTypeId, setProductTypeId] = React.useState(
    initialData?.productTypeId || productTypes[0]?.id || ""
  );
  const [primaryCategoryId, setPrimaryCategoryId] = React.useState(
    initialData?.primaryCategoryId || categories[0]?.id || ""
  );
  const [modelCode, setModelCode] = React.useState(initialData?.modelCode || "");
  const [shortDescription, setShortDescription] = React.useState(
    initialData?.shortDescription || ""
  );
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [basePrice, setBasePrice] = React.useState(
    initialData?.basePrice !== undefined ? String(initialData.basePrice) : ""
  );
  const [compareAtPrice, setCompareAtPrice] = React.useState(
    initialData?.compareAtPrice ? String(initialData.compareAtPrice) : ""
  );
  const [costPrice, setCostPrice] = React.useState(
    initialData?.costPrice ? String(initialData.costPrice) : ""
  );
  const [status, setStatus] = React.useState<ProductStatus>(
    initialData?.status || "draft"
  );
  const [isFeatured, setIsFeatured] = React.useState(
    initialData?.isFeatured ?? false
  );
  const [isNewArrival, setIsNewArrival] = React.useState(
    initialData?.isNewArrival ?? false
  );
  const [isOnSale, setIsOnSale] = React.useState(initialData?.isOnSale ?? false);
  const [seoTitle, setSeoTitle] = React.useState(initialData?.seoTitle || "");
  const [seoDescription, setSeoDescription] = React.useState(
    initialData?.seoDescription || ""
  );

  // Media state
  const [mediaList, setMediaList] = React.useState<ProductMediaItemInput[]>(
    initialData?.media?.map((m) => ({
      id: m.id,
      url: m.url,
      altText: m.altText || "",
      sortOrder: m.sortOrder,
      isPrimary: m.isPrimary,
    })) || []
  );
  const [newImageUrl, setNewImageUrl] = React.useState("");
  const [newImageAlt, setNewImageAlt] = React.useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [successToast, setSuccessToast] = React.useState<string | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isArchiveLoading, setIsArchiveLoading] = React.useState(false);

  // Slug auto-generation flag
  const [isSlugManual, setIsSlugManual] = React.useState(Boolean(initialData?.slug));

  // Collections integration state
  const [availableCollections, setAvailableCollections] = React.useState<Collection[]>([]);
  const [assignedCollectionIds, setAssignedCollectionIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let isMounted = true;
    async function loadCollections() {
      try {
        const res = await fetch("/api/admin/collections?status=all&limit=100");
        const json = await res.json();
        if (json.success && json.items && isMounted) {
          setAvailableCollections(json.items.filter((c: Collection) => !c.deletedAt));
        }
      } catch (err) {
        console.error("Failed to fetch collections:", err);
      }
    }
    loadCollections();
    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    const currentProductId = initialData?.id;
    if (!currentProductId || availableCollections.length === 0) return;
    let isMounted = true;
    async function checkAssignedCollections() {
      const assigned = new Set<string>();
      await Promise.all(
        availableCollections.map(async (col) => {
          try {
            const res = await fetch(`/api/admin/collections/${col.id}/products`);
            const json = await res.json();
            if (json.success && json.data) {
              const hasProd = json.data.some((p: { productId: string }) => p.productId === currentProductId);
              if (hasProd) assigned.add(col.id);
            }
          } catch {
            // Ignore
          }
        })
      );
      if (isMounted) {
        setAssignedCollectionIds(assigned);
      }
    }
    checkAssignedCollections();
    return () => {
      isMounted = false;
    };
  }, [initialData?.id, availableCollections]);

  const handleToggleCollection = async (collectionId: string) => {
    if (!initialData?.id) return;
    const isCurrentlyAssigned = assignedCollectionIds.has(collectionId);

    // Optimistic toggle
    setAssignedCollectionIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyAssigned) next.delete(collectionId);
      else next.add(collectionId);
      return next;
    });

    try {
      if (isCurrentlyAssigned) {
        await fetch(`/api/admin/collections/${collectionId}/products?productId=${initialData.id}`, {
          method: "DELETE",
        });
      } else {
        await fetch(`/api/admin/collections/${collectionId}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: initialData.id }),
        });
      }
    } catch (err) {
      console.error("Toggle collection error:", err);
      // Revert on error
      setAssignedCollectionIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyAssigned) next.add(collectionId);
        else next.delete(collectionId);
        return next;
      });
    }
  };

  // Refresher handlers for variants and attributes
  const handleRefreshVariants = React.useCallback(async () => {
    if (!initialData?.id) return;
    try {
      const res = await getVariantsByProductAction(initialData.id, { includeArchived: true });
      if (res.success && res.data) {
        setVariantsList(res.data as ProductVariant[]);
      }
    } catch (err) {
      console.error("Refresh variants error:", err);
    }
  }, [initialData?.id]);

  const handleRefreshAttributes = React.useCallback(async () => {
    if (!initialData?.id) return;
    try {
      const res = await getProductAttributesAction(initialData.id);
      if (res.success && res.data) {
        setAssignedAttributesList(res.data as Attribute[]);
      }
    } catch (err) {
      console.error("Refresh attributes error:", err);
    }
  }, [initialData?.id]);

  const handleRefreshProductVariants = React.useCallback(() => {
    handleRefreshVariants();
    router.refresh();
  }, [handleRefreshVariants, router]);

  const handleProductAttributesUpdated = React.useCallback(() => {
    handleRefreshAttributes();
    handleRefreshVariants();
    router.refresh();
  }, [handleRefreshAttributes, handleRefreshVariants, router]);

  const memoizedProductForVariants = React.useMemo(() => {
    if (!initialData) return null;
    return {
      ...initialData,
      variants: variantsList,
      assignedAttributes: assignedAttributesList,
      media: mediaList.map((m, idx) => ({
        id: m.id || `m-${idx}`,
        productId: initialData.id,
        url: m.url,
        altText: m.altText,
        mimeType: "image/jpeg",
        sortOrder: m.sortOrder,
        isPrimary: m.isPrimary,
        createdAt: initialData.createdAt || "2026-01-01T00:00:00Z",
      })),
    };
  }, [initialData, variantsList, assignedAttributesList, mediaList]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isSlugManual) {
      setSlug(generateSlug(val));
    }
  };

  const handleGenerateSlug = () => {
    setSlug(generateSlug(title));
  };

  const handleAddMedia = () => {
    if (!newImageUrl.trim()) return;
    try {
      new URL(newImageUrl.trim());
    } catch {
      setErrorMessage("Please enter a valid HTTP/HTTPS image URL.");
      return;
    }

    const isFirst = mediaList.length === 0;
    setMediaList((prev) => [
      ...prev,
      {
        url: newImageUrl.trim(),
        altText: newImageAlt.trim() || title,
        sortOrder: prev.length,
        isPrimary: isFirst,
      },
    ]);
    setNewImageUrl("");
    setNewImageAlt("");
    setErrorMessage(null);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Ensure at least one primary image remains if there are items
      if (updated.length > 0 && !updated.some((m) => m.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
  };

  const handleSetPrimaryMedia = (index: number) => {
    setMediaList((prev) =>
      prev.map((item, i) => ({
        ...item,
        isPrimary: i === index,
      }))
    );
  };

  // Calculated economics / margins
  const numericBasePrice = parseFloat(basePrice) || 0;
  const numericCostPrice = parseFloat(costPrice) || 0;
  const profitMargin =
    numericBasePrice > 0 && numericCostPrice > 0
      ? ((numericBasePrice - numericCostPrice) / numericBasePrice) * 100
      : null;

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    const payload: CreateProductInput = {
      title: title.trim(),
      slug: slug.trim(),
      brand: brand.trim(),
      productTypeId,
      primaryCategoryId,
      modelCode: modelCode.trim() || undefined,
      shortDescription: shortDescription.trim() || undefined,
      description: description.trim(),
      basePrice: numericBasePrice,
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      costPrice: costPrice ? parseFloat(costPrice) : null,
      status,
      isFeatured,
      isNewArrival,
      isOnSale,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      media: mediaList,
    };

    try {
      if (mode === "create") {
        const res = await createProductAction(payload);
        if (!res.success) {
          setErrorMessage(res.error);
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          setIsSubmitting(false);
          return;
        }

        setSuccessToast("Product created successfully! Redirecting...");
        setTimeout(() => {
          router.push("/admin/products");
          router.refresh();
        }, 800);
      } else {
        if (!initialData?.id) throw new Error("Missing product ID");
        const res = await updateProductAction({
          ...payload,
          id: initialData.id,
        });

        if (!res.success) {
          setErrorMessage(res.error);
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          setIsSubmitting(false);
          return;
        }

        setSuccessToast("Product changes saved successfully.");
        setTimeout(() => setSuccessToast(null), 3000);
        router.refresh();
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive / Restore handlers
  const handleArchiveConfirm = async () => {
    if (!initialData?.id) return;
    setIsArchiveLoading(true);

    try {
      if (status === "archived") {
        const res = await restoreProductAction(initialData.id);
        if (res.success) {
          setStatus("draft");
          setIsArchiveModalOpen(false);
          setSuccessToast("Product restored to draft status.");
          router.refresh();
        } else {
          setErrorMessage(res.error);
        }
      } else {
        const res = await archiveProductAction(initialData.id);
        if (res.success) {
          setStatus("archived");
          setIsArchiveModalOpen(false);
          setSuccessToast("Product archived.");
          router.refresh();
        } else {
          setErrorMessage(res.error);
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsArchiveLoading(false);
    }
  };

  // Publish / Unpublish toggle
  const handleTogglePublish = async () => {
    if (!initialData?.id) return;
    const targetStatus = status === "active" ? "draft" : "active";
    setIsSubmitting(true);

    try {
      const res = await toggleProductPublishAction(initialData.id, targetStatus);
      if (res.success) {
        setStatus(targetStatus);
        setSuccessToast(
          targetStatus === "active"
            ? "Product published to store."
            : "Product unpublished (set to draft)."
        );
        router.refresh();
      } else {
        setErrorMessage(res.error);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl pb-16">
      {/* Top Notification / Alerts */}
      {successToast && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{errorMessage}</span>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                {Object.entries(fieldErrors).map(([field, errors]) => (
                  <li key={field}>
                    <strong className="capitalize">{field}</strong>: {errors.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Header Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center h-8 w-8 rounded-none border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-light uppercase tracking-tight text-neutral-950">
                {mode === "create" ? "New Product" : initialData?.title}
              </h1>
              <ProductStatusBadge status={status} />
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {mode === "create"
                ? "Configure core metadata, pricing, merchandising, and media."
                : `Product ID: ${initialData?.id} · Last updated: ${new Date(initialData?.updatedAt || "").toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {mode === "edit" && initialData && (
            <>
              {status !== "archived" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePublish}
                  disabled={isSubmitting}
                >
                  {status === "active" ? "Unpublish to Draft" : "Publish to Store"}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsArchiveModalOpen(true)}
                disabled={isSubmitting}
                className={status === "archived" ? "text-emerald-700" : "text-rose-700"}
              >
                {status === "archived" ? (
                  <>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    <span>Restore Product</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    <span>Archive</span>
                  </>
                )}
              </Button>
            </>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            <span>{mode === "create" ? "Create Product" : "Save Changes"}</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs (Details & Media, Variants, Attributes & Options) */}
      {mode === "edit" && initialData && (
        <div className="flex border-b border-stone-200 gap-6 -mt-2 mb-2">
          <button
            type="button"
            id="tab-btn-details"
            onClick={() => setActiveTab("details")}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors relative ${
              activeTab === "details"
                ? "text-stone-900 border-b-2 border-stone-900"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Product Details & Media
          </button>

          <button
            type="button"
            id="tab-btn-variants"
            onClick={() => setActiveTab("variants")}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-1.5 ${
              activeTab === "variants"
                ? "text-stone-900 border-b-2 border-stone-900"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Variants
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === "variants"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {variantsList.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-attributes"
            onClick={() => setActiveTab("attributes")}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-1.5 ${
              activeTab === "attributes"
                ? "text-stone-900 border-b-2 border-stone-900"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Attributes & Options
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === "attributes"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {assignedAttributesList.length}
            </span>
          </button>
        </div>
      )}

      {/* Tab: Variants */}
      {activeTab === "variants" && initialData && memoizedProductForVariants && (
        <ProductVariantsTab
          product={memoizedProductForVariants}
          assignedAttributes={assignedAttributesList}
          onNavigateToAttributesTab={() => setActiveTab("attributes")}
          onRefreshProduct={handleRefreshProductVariants}
        />
      )}

      {/* Tab: Attributes */}
      {activeTab === "attributes" && initialData && (
        <ProductAttributesTab
          productId={initialData.id}
          productTitle={initialData.title}
          assignedAttributes={assignedAttributesList}
          allAttributes={allAttributes}
          onAttributesUpdated={handleProductAttributesUpdated}
        />
      )}

      {/* Main Form Body (Organized 2-Column Grid) */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Core Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card 1: Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Primary identification and brand copy for this fashion product.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Product Title <span className="text-rose-600">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. The Heritage Cap-Toe Oxford"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Brand Name <span className="text-rose-600">*</span>
                  </label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Atelier Artisans"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Model / Style Code
                  </label>
                  <Input
                    value={modelCode}
                    onChange={(e) => setModelCode(e.target.value)}
                    placeholder="e.g. OXF-200-V1"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    URL Slug <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSlug}
                    className="text-[11px] text-neutral-600 hover:text-neutral-900 underline uppercase tracking-wider"
                  >
                    Regenerate from Title
                  </button>
                </div>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 py-2 border border-r-0 border-neutral-300 bg-neutral-100 text-neutral-500 text-xs select-none">
                    /products/
                  </span>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setIsSlugManual(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="heritage-cap-toe-oxford"
                    required
                    className="rounded-l-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Unique, URL-safe identifier for customer storefront routing.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Short Description
                </label>
                <Input
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Single-sentence overview for catalog teasers and cards"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Full Description <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                  placeholder="Detailed craftsmanship notes, materials, construction techniques, and leather care..."
                  className="w-full border border-neutral-300 p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Pricing & Margins */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Commercial Economics</CardTitle>
              <CardDescription>
                Set currency retail prices and track cost of goods for margin analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Base Price ($) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-neutral-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="295.00"
                      className="pl-7"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Compare-at Price ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-neutral-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      placeholder="350.00"
                      className="pl-7"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-500">
                    MSRP strike-through price
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Cost Price ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-neutral-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="110.00"
                      className="pl-7"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-500">
                    Internal COGS per unit
                  </p>
                </div>
              </div>

              {profitMargin !== null && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-neutral-500">Unit Profit: </span>
                    <strong className="font-semibold text-neutral-900">
                      ${(numericBasePrice - numericCostPrice).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">Gross Margin: </span>
                    <strong
                      className={`font-semibold ${
                        profitMargin >= 50
                          ? "text-emerald-700"
                          : profitMargin >= 30
                          ? "text-amber-700"
                          : "text-rose-700"
                      }`}
                    >
                      {profitMargin.toFixed(1)}%
                    </strong>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Media & Imagery */}
          <Card>
            <CardHeader>
              <CardTitle>Product Media & Gallery</CardTitle>
              <CardDescription>
                High-resolution lifestyle and editorial imagery for catalog presentation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Media gallery list */}
              {mediaList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mediaList.map((media, idx) => (
                    <div
                      key={idx}
                      className={`relative border p-2 flex flex-col justify-between ${
                        media.isPrimary
                          ? "border-neutral-950 bg-neutral-50"
                          : "border-neutral-200 bg-white"
                      }`}
                    >
                      <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={media.url}
                          alt={media.altText || "Product preview"}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80";
                          }}
                        />
                        {media.isPrimary && (
                          <span className="absolute top-1.5 left-1.5 bg-neutral-950 text-white text-[9px] font-bold uppercase px-1.5 py-0.5">
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] text-neutral-500 truncate" title={media.url}>
                          {media.altText || "No alt text"}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                          {!media.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryMedia(idx)}
                              className="text-[10px] text-neutral-600 hover:text-neutral-950 uppercase tracking-wider font-medium"
                            >
                              Make Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(idx)}
                            className="text-[10px] text-rose-600 hover:text-rose-800 ml-auto p-1"
                            title="Remove image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-neutral-300 text-center text-neutral-500">
                  <ImageIcon className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
                  <p className="text-xs font-medium">No media uploaded yet</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Add image URLs below to populate the customer storefront gallery.
                  </p>
                </div>
              )}

              {/* Add image input row */}
              <div className="pt-3 border-t border-neutral-200">
                <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
                  Add Image URL
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1"
                  />
                  <Input
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                    placeholder="Image alt description"
                    className="sm:w-48"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMedia}
                    disabled={!newImageUrl.trim()}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Search Engine Optimization (SEO) */}
          <Card>
            <CardHeader>
              <CardTitle>Search Engine Optimization (SEO)</CardTitle>
              <CardDescription>
                Customize meta tags to optimize discoverability on search engines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    SEO Title
                  </label>
                  <span
                    className={`text-[10px] ${
                      seoTitle.length > 60 ? "text-amber-600" : "text-neutral-400"
                    }`}
                  >
                    {seoTitle.length} / 60 characters
                  </span>
                </div>
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || "Men's Heritage Dress Shoe | Atelier"}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    SEO Meta Description
                  </label>
                  <span
                    className={`text-[10px] ${
                      seoDescription.length > 160
                        ? "text-amber-600"
                        : "text-neutral-400"
                    }`}
                  >
                    {seoDescription.length} / 160 characters
                  </span>
                </div>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={3}
                  placeholder={
                    shortDescription ||
                    "Shop handcrafted Goodyear-welted French calfskin footwear..."
                  }
                  className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
                />
              </div>

              {/* Live Google Search Preview */}
              <div className="mt-4 p-4 bg-neutral-50 border border-neutral-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-2">
                  Search Result Snippet Preview
                </span>
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500 font-mono block">
                    https://atelier.example.com/products/{slug || "example-product"}
                  </span>
                  <h4 className="text-sm text-blue-700 hover:underline font-medium cursor-pointer">
                    {seoTitle || title || "Product Title Example | Brand"}
                  </h4>
                  <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                    {seoDescription ||
                      shortDescription ||
                      description ||
                      "Add a description to inspect how this product will display on Google search result pages."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Classification & Merchandising */}
        <div className="space-y-8">
          {/* Card 5: Catalog Status */}
          <Card>
            <CardHeader>
              <CardTitle>Product Status</CardTitle>
              <CardDescription>
                Controls customer visibility and checkout availability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="w-full h-10 border border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none uppercase font-medium"
                >
                  <option value="draft">Draft (Hidden from storefront)</option>
                  <option value="active">Active (Publicly visible & buyable)</option>
                  {mode === "edit" && (
                    <option value="archived">Archived (Retired)</option>
                  )}
                </select>
              </div>

              <div className="text-[11px] text-neutral-500 p-2.5 bg-neutral-50 border border-neutral-200">
                {status === "active" && (
                  <p className="text-emerald-800">
                    ✓ This product is live in your catalog and accessible to all shoppers.
                  </p>
                )}
                {status === "draft" && (
                  <p className="text-amber-800">
                    ⚠ In draft state. Only staff and admins can preview this record.
                  </p>
                )}
                {status === "archived" && (
                  <p className="text-neutral-700">
                    ✕ Soft-deleted from active store. Historic orders remain intact.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Taxonomy & Organization */}
          <Card>
            <CardHeader>
              <CardTitle>Taxonomy & Category</CardTitle>
              <CardDescription>
                Assign high-level product type and category.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Product Type <span className="text-rose-600">*</span>
                </label>
                <select
                  value={productTypeId}
                  onChange={(e) => setProductTypeId(e.target.value)}
                  required
                  className="w-full h-10 border border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                >
                  {productTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-neutral-500">
                  Defines general merchandising behavior (Footwear, Apparel, Accessories).
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Primary Category <span className="text-rose-600">*</span>
                  </label>
                  <Link
                    href="/admin/categories"
                    target="_blank"
                    className="text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 text-[11px] font-medium"
                  >
                    <span>Taxonomy</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <select
                  value={primaryCategoryId}
                  onChange={(e) => setPrimaryCategoryId(e.target.value)}
                  required
                  className="w-full h-10 border border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                >
                  {categories.map((cat) => {
                    const indent = "— ".repeat(cat.level || (cat.parentId ? 1 : 0));
                    return (
                      <option key={cat.id} value={cat.id}>
                        {indent}{cat.name} {cat.path ? `(${cat.path})` : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-[10px] text-neutral-500">
                  Governs breadcrumb hierarchy and catalog navigation routes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card: Collections & Capsule Drops */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Collections & Drops</CardTitle>
                <CardDescription>
                  Assign to curated seasonal capsules and merchandising stories.
                </CardDescription>
              </div>
              <Link
                href="/admin/collections"
                target="_blank"
                className="text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 text-[11px] font-medium"
              >
                <span>Manage</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {mode === "create" ? (
                <p className="text-[11px] text-neutral-500 italic">
                  Collections can be assigned once the product record is created.
                </p>
              ) : availableCollections.length === 0 ? (
                <p className="text-[11px] text-neutral-500">
                  No active collections configured yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableCollections.map((col) => {
                    const isChecked = assignedCollectionIds.has(col.id);
                    return (
                      <label
                        key={col.id}
                        className="flex items-center justify-between p-2.5 hover:bg-neutral-50 border border-neutral-200 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCollection(col.id)}
                            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                          />
                          <div>
                            <span className="text-xs font-medium text-neutral-900 block">
                              {col.title}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono block">
                              /{col.slug}
                            </span>
                          </div>
                        </div>
                        {col.isFeatured && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 font-medium border border-amber-200">
                            Featured
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 7: Merchandising Flags */}
          <Card>
            <CardHeader>
              <CardTitle>Merchandising Flags</CardTitle>
              <CardDescription>
                Promotional tags and collection triggers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                />
                <div>
                  <span className="text-xs font-medium text-neutral-900 block">
                    Featured Product
                  </span>
                  <span className="text-[11px] text-neutral-500 block">
                    Highlight on homepage carousel and curated collections.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNewArrival}
                  onChange={(e) => setIsNewArrival(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                />
                <div>
                  <span className="text-xs font-medium text-neutral-900 block">
                    New Arrival
                  </span>
                  <span className="text-[11px] text-neutral-500 block">
                    Display &quot;New Arrival&quot; badge in catalog grids.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOnSale}
                  onChange={(e) => setIsOnSale(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                />
                <div>
                  <span className="text-xs font-medium text-neutral-900 block">
                    On Sale Flag
                  </span>
                  <span className="text-[11px] text-neutral-500 block">
                    Highlight markdown badge and sort in sale collections.
                  </span>
                </div>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* Confirmation Modal */}
      {initialData && (
        <ArchiveConfirmModal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          onConfirm={handleArchiveConfirm}
          productTitle={initialData.title}
          isArchived={status === "archived"}
          isLoading={isArchiveLoading}
        />
      )}
    </form>
  );
}
