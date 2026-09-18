"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Collection, CollectionProductItem, Product } from "@/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Package,
  Check,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";

interface AdminCollectionDetailClientProps {
  collection: Collection;
  initialProducts: CollectionProductItem[];
}

export function AdminCollectionDetailClient({
  collection,
  initialProducts,
}: AdminCollectionDetailClientProps) {
  const [items, setItems] = useState<CollectionProductItem[]>(initialProducts);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  // Add Product Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allCatalogProducts, setAllCatalogProducts] = useState<Product[]>([]);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState("");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isAddingId, setIsAddingId] = useState<string | null>(null);

  // Fetch all products for adding modal
  const openAddModal = async () => {
    setIsAddModalOpen(true);
    setIsLoadingCatalog(true);
    try {
      const res = await fetch("/api/admin/products?limit=100&status=all");
      const data = await res.json();
      const productList = data.items || data.data || [];
      if (Array.isArray(productList)) {
        setAllCatalogProducts(productList);
      }
    } catch (err) {
      console.error("Failed to fetch catalog products:", err);
      showError("Could not load products. Please check network.");
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const assignedProductIds = useMemo(() => {
    return new Set(items.map((i) => i.productId));
  }, [items]);

  const filteredCatalog = useMemo(() => {
    return allCatalogProducts.filter((p) => {
      if (!p) return false;
      if (!searchCatalogQuery.trim()) return true;
      const q = searchCatalogQuery.toLowerCase().trim();
      return (
        (p.title || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.slug || "").toLowerCase().includes(q)
      );
    });
  }, [allCatalogProducts, searchCatalogQuery]);

  // Handle adding product to collection
  const handleAddProduct = async (product: Product) => {
    setIsAddingId(product.id);
    try {
      const nextSortOrder = items.length + 1;
      const res = await fetch(`/api/admin/collections/${collection.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, sortOrder: nextSortOrder }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add product");
      }

      // Add to local state
      const newItem: CollectionProductItem = {
        collectionId: collection.id,
        productId: product.id,
        sortOrder: nextSortOrder,
        addedAt: new Date().toISOString(),
        product: {
          id: product.id,
          title: product.title,
          slug: product.slug,
          brand: product.brand,
          basePrice: product.basePrice,
          status: product.status,
          primaryCategoryName: product.primaryCategory?.name,
          thumbnailUrl: product.media?.[0]?.url || null,
        },
      };

      setItems((prev) => [...prev, newItem]);
      setSuccessToast(`Added "${product.title}" to collection.`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setIsAddingId(null);
    }
  };

  // Handle removing product from collection
  const handleRemoveProduct = async (productId: string, title?: string) => {
    try {
      const res = await fetch(
        `/api/admin/collections/${collection.id}/products?productId=${productId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to remove product");
      }

      setItems((prev) => prev.filter((i) => i.productId !== productId));
      setSuccessToast(title ? `Removed "${title}" from collection.` : "Product removed from collection.");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to remove product");
    }
  };

  // Move product up/down in order
  const moveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === items.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // update sortOrder index
    const reordered = newItems.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    setItems(reordered);
    setIsDirty(true);
  };

  // Save reordered list
  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const productIds = items.map((i) => i.productId);
      const res = await fetch(`/api/admin/collections/${collection.id}/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save product ordering");
      }

      setIsDirty(false);
      setSuccessToast("Product sequence saved successfully.");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save order");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-neutral-900 text-white text-xs font-medium shadow-xl flex items-center gap-2 border border-neutral-700 animate-slide-up">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-rose-900 text-white text-xs font-medium shadow-xl flex items-center gap-2 border border-rose-700 animate-slide-up">
          <AlertCircle className="w-4 h-4 text-rose-300" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div className="space-y-1">
          <Link
            href="/admin/collections"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Collections</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              {collection.title}
            </h1>
            <span className="text-xs font-mono text-neutral-500">
              /{collection.slug}
            </span>
            {collection.isPublished ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800">
                Published
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800">
                Draft
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            {collection.description || "No description specified."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveOrder}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Product Order"}
            </button>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Products
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white border border-neutral-200">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
            Curated Merchandise ({items.length} products)
          </span>
          <span className="text-[11px] text-neutral-500">
            Use the up/down controls to arrange showcase sequence
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="text-xs text-neutral-600 font-medium">
              No products have been assigned to this collection yet.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Product
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {items.map((item, index) => {
              const prod = item.product;
              return (
                <div
                  key={item.productId}
                  className="flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-colors"
                >
                  {/* Sequence Order & Move controls */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-mono text-xs font-bold text-neutral-400">
                      #{index + 1}
                    </span>

                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveItem(index, "up")}
                        className="p-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 hover:bg-neutral-200/50 rounded"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === items.length - 1}
                        onClick={() => moveItem(index, "down")}
                        className="p-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 hover:bg-neutral-200/50 rounded"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Product Media Thumbnail */}
                    <div className="w-12 h-12 bg-neutral-100 border border-neutral-200 flex-shrink-0 overflow-hidden">
                      {prod?.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.thumbnailUrl}
                          alt={prod.title}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/products/${item.productId}`}
                          className="text-xs font-bold text-neutral-900 hover:underline"
                        >
                          {prod?.title || item.productId}
                        </Link>
                        {prod?.primaryCategoryName && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-600 font-medium">
                            {prod.primaryCategoryName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Brand: {prod?.brand || "Atelier"} · Base Price: ${Number(prod?.basePrice || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">
                      {item.addedAt ? `Added ${new Date(item.addedAt).toLocaleDateString()}` : ""}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(item.productId, prod?.title)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove from collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Products Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-neutral-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Add Products to Collection
                </h3>
                <p className="text-xs text-neutral-500">
                  Search and assign items from your footwear and fashion catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-neutral-200 bg-neutral-50">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchCatalogQuery}
                  onChange={(e) => setSearchCatalogQuery(e.target.value)}
                  placeholder="Search products by title, model, or brand..."
                  className="w-full h-9 pl-9 pr-3 text-xs border border-neutral-300 bg-white focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-100">
              {isLoadingCatalog ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  Loading catalog products...
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No matching products found.
                </div>
              ) : (
                filteredCatalog.map((product) => {
                  const isAssigned = assignedProductIds.has(product.id);
                  const isAdding = isAddingId === product.id;

                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between py-3 px-2 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-100 border border-neutral-200 flex-shrink-0 overflow-hidden">
                          {product.media?.[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.media[0].url}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-neutral-900">
                            {product.title}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {product.brand || "Unbranded"} · ${(Number(product.basePrice) || 0).toFixed(2)} · {product.primaryCategory?.name || "General"}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400 px-3 py-1 bg-neutral-100 border border-neutral-200">
                            <Check className="w-3.5 h-3.5" />
                            Assigned
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isAdding}
                            onClick={() => handleAddProduct(product)}
                            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {isAdding ? "Adding..." : "Add"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 border border-neutral-300 bg-white hover:bg-neutral-100"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
