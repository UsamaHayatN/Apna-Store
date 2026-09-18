"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
  Star,
  Tag,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Product, Category, ProductType, PaginatedResult } from "@/types";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { ArchiveConfirmModal } from "./ArchiveConfirmModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  archiveProductAction,
  restoreProductAction,
  toggleProductPublishAction,
} from "@/app/actions/products";

interface AdminProductListClientProps {
  initialResult: PaginatedResult<Product>;
  categories: Category[];
  productTypes: ProductType[];
  initialFilters: {
    search?: string;
    category?: string;
    productType?: string;
    status?: string;
    featured?: boolean;
    newArrival?: boolean;
    onSale?: boolean;
    sort?: string;
    page?: number;
  };
}

export function AdminProductListClient({
  initialResult,
  categories,
  productTypes,
  initialFilters,
}: AdminProductListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = React.useState(initialFilters.search || "");
  const [selectedCategory, setSelectedCategory] = React.useState(
    initialFilters.category || "all"
  );
  const [selectedProductType, setSelectedProductType] = React.useState(
    initialFilters.productType || "all"
  );
  const [selectedStatus, setSelectedStatus] = React.useState(
    initialFilters.status || "all"
  );
  const [filterFeatured, setFilterFeatured] = React.useState(
    initialFilters.featured || false
  );
  const [filterNewArrival, setFilterNewArrival] = React.useState(
    initialFilters.newArrival || false
  );
  const [filterOnSale, setFilterOnSale] = React.useState(
    initialFilters.onSale || false
  );
  const [sortOption, setSortOption] = React.useState(
    initialFilters.sort || "newest"
  );
  const [currentPage, setCurrentPage] = React.useState(
    initialFilters.page || 1
  );

  // Data state
  const [productsData, setProductsData] = React.useState<PaginatedResult<Product>>(initialResult);
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  // Modal state
  const [modalProduct, setModalProduct] = React.useState<Product | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isModalLoading, setIsModalLoading] = React.useState(false);

  // Sync state with props on initial load
  React.useEffect(() => {
    setProductsData(initialResult);
  }, [initialResult]);

  const isFirstRender = React.useRef(true);

  // Fetch updated data from API when filters change
  const fetchProducts = React.useCallback(
    async (pageToFetch: number = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (selectedCategory && selectedCategory !== "all") {
          params.set("category", selectedCategory);
        }
        if (selectedProductType && selectedProductType !== "all") {
          params.set("productType", selectedProductType);
        }
        if (selectedStatus && selectedStatus !== "all") {
          params.set("status", selectedStatus);
        }
        if (filterFeatured) params.set("featured", "true");
        if (filterNewArrival) params.set("newArrival", "true");
        if (filterOnSale) params.set("onSale", "true");
        if (sortOption) params.set("sort", sortOption);
        params.set("page", String(pageToFetch));
        params.set("limit", "10");

        // Update URL shallowly for bookmarks/back button
        const newUrl = `/admin/products?${params.toString()}`;
        window.history.replaceState(null, "", newUrl);

        const res = await fetch(`/api/admin/products?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch products");
        const json: PaginatedResult<Product> = await res.json();
        setProductsData(json);
      } catch (err) {
        console.error("fetchProducts error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      searchTerm,
      selectedCategory,
      selectedProductType,
      selectedStatus,
      filterFeatured,
      filterNewArrival,
      filterOnSale,
      sortOption,
    ]
  );

  // Trigger search on debounced input (skipping first mount because initialResult is already hydrated)
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchProducts(1);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    searchTerm,
    selectedCategory,
    selectedProductType,
    selectedStatus,
    filterFeatured,
    filterNewArrival,
    filterOnSale,
    sortOption,
    fetchProducts,
  ]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > productsData.totalPages) return;
    setCurrentPage(newPage);
    fetchProducts(newPage);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedProductType("all");
    setSelectedStatus("all");
    setFilterFeatured(false);
    setFilterNewArrival(false);
    setFilterOnSale(false);
    setSortOption("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    selectedCategory !== "all" ||
    selectedProductType !== "all" ||
    selectedStatus !== "all" ||
    filterFeatured ||
    filterNewArrival ||
    filterOnSale ||
    sortOption !== "newest";

  // Fast Publish/Unpublish toggle
  const handleTogglePublish = async (prod: Product) => {
    const targetStatus = prod.status === "active" ? "draft" : "active";
    try {
      const res = await toggleProductPublishAction(prod.id, targetStatus);
      if (res.success) {
        setActionSuccessMessage(
          targetStatus === "active"
            ? `"${prod.title}" is now active on the storefront.`
            : `"${prod.title}" was moved to draft status.`
        );
        setTimeout(() => setActionSuccessMessage(null), 3000);
        fetchProducts(currentPage);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Archive / Restore action
  const handleArchiveConfirm = async () => {
    if (!modalProduct) return;
    setIsModalLoading(true);

    try {
      if (modalProduct.status === "archived") {
        const res = await restoreProductAction(modalProduct.id);
        if (res.success) {
          setActionSuccessMessage(`"${modalProduct.title}" was restored to draft.`);
          setIsArchiveModalOpen(false);
          setModalProduct(null);
          fetchProducts(currentPage);
        }
      } else {
        const res = await archiveProductAction(modalProduct.id);
        if (res.success) {
          setActionSuccessMessage(`"${modalProduct.title}" was archived.`);
          setIsArchiveModalOpen(false);
          setModalProduct(null);
          fetchProducts(currentPage);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsModalLoading(false);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Toast Alert */}
      {actionSuccessMessage && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Catalog Management
          </span>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-light uppercase tracking-tight text-neutral-950">
              Products
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono bg-neutral-100 text-neutral-700 border border-neutral-200">
              {productsData.total} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Manage commercial merchandise, pricing, categories, and published catalog status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/products/new">
            <Button variant="primary" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span>Create Product</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-white border border-neutral-200 p-4 space-y-4">
        {/* Row 1: Search & Primary Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, brand, SKU, slug..."
              className="pl-9 pr-8"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-11 border border-neutral-300 bg-white px-3 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `— ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Type Selector */}
          <div>
            <select
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
              className="w-full h-11 border border-neutral-300 bg-white px-3 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
            >
              <option value="all">All Product Types</option>
              {productTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-11 border border-neutral-300 bg-white px-3 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
            >
              <option value="all">Status: Active & Draft</option>
              <option value="active">Active Only</option>
              <option value="draft">Draft Only</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>
        </div>

        {/* Row 2: Merchandising Pills & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mr-1">
              Filter By:
            </span>

            <button
              type="button"
              onClick={() => setFilterFeatured(!filterFeatured)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border transition-colors ${
                filterFeatured
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              <Star className="h-3 w-3" />
              <span>Featured</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterNewArrival(!filterNewArrival)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border transition-colors ${
                filterNewArrival
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>New Arrivals</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterOnSale(!filterOnSale)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border transition-colors ${
                filterOnSale
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              <Tag className="h-3 w-3" />
              <span>On Sale</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-neutral-500 hover:text-neutral-900 underline ml-2"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Sort:
            </span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="h-8 border border-neutral-300 bg-white px-2.5 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Title A-Z</option>
              <option value="name_desc">Title Z-A</option>
              <option value="price_asc">Price Low to High</option>
              <option value="price_desc">Price High to Low</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table Container */}
      <div className="bg-white border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-4 w-14">Image</th>
                <th className="py-3 px-4">Product & Identification</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Base Retail Price</th>
                <th className="py-3 px-4">Merchandising</th>
                <th className="py-3 px-4">Catalog Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-10 w-10 bg-neutral-200" />
                    </td>
                    <td className="py-3 px-4 space-y-1.5">
                      <div className="h-3.5 w-48 bg-neutral-200" />
                      <div className="h-2.5 w-24 bg-neutral-100" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 w-20 bg-neutral-200" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 w-16 bg-neutral-200" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 w-24 bg-neutral-100" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-14 bg-neutral-200" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-7 w-20 bg-neutral-200 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : productsData.data.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={7} className="py-16 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <Package className="h-10 w-10 text-neutral-400 mx-auto" />
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
                        No Products Found
                      </h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {hasActiveFilters
                          ? "No products matched your current search filters. Try adjusting or resetting your filter criteria."
                          : "Your product catalog is currently empty. Create your first product to begin selling."}
                      </p>
                      <div className="pt-2 flex justify-center gap-3">
                        {hasActiveFilters ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearFilters}
                          >
                            Clear All Filters
                          </Button>
                        ) : (
                          <Link href="/admin/products/new">
                            <Button variant="primary" size="sm">
                              <Plus className="mr-1.5 h-3.5 w-3.5" />
                              <span>Create First Product</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                productsData.data.map((product) => {
                  const primaryImg =
                    product.media?.find((m) => m.isPrimary) || product.media?.[0];

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-neutral-50/80 transition-colors"
                    >
                      {/* Image Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="h-11 w-11 bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0">
                          {primaryImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={primaryImg.url}
                              alt={primaryImg.altText || product.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=150&q=80";
                              }}
                            />
                          ) : (
                            <Package className="h-5 w-5 text-neutral-400" />
                          )}
                        </div>
                      </td>

                      {/* Product Title & Brand */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-medium text-neutral-950 hover:underline block leading-snug"
                        >
                          {product.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500">
                          <span className="font-semibold text-neutral-700">
                            {product.brand}
                          </span>
                          {product.modelCode && (
                            <>
                              <span>·</span>
                              <span className="font-mono">{product.modelCode}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="font-mono text-neutral-400 truncate max-w-[130px]" title={product.slug}>
                            /{product.slug}
                          </span>
                          {(product.variantCount !== undefined && product.variantCount > 0) || (product.variants && product.variants.length > 0) ? (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 font-mono text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">
                                <Layers className="w-2.5 h-2.5 text-stone-500" />
                                {product.variants?.length ?? product.variantCount} {(product.variants?.length ?? product.variantCount) === 1 ? "variant" : "variants"}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </td>

                      {/* Category & Type */}
                      <td className="py-3 px-4">
                        <span className="text-neutral-800 font-medium block">
                          {product.primaryCategory?.name ||
                            product.category?.name ||
                            "Uncategorized"}
                        </span>
                        <span className="text-[11px] text-neutral-500 block">
                          {product.productType?.name || "Standard"}
                        </span>
                      </td>

                      {/* Base Price & Compare */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-semibold text-neutral-900">
                          ${product.basePrice.toFixed(2)}
                        </span>
                        {product.compareAtPrice && (
                          <span className="ml-2 text-neutral-400 line-through text-[11px]">
                            ${product.compareAtPrice.toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Merchandising Badges */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {product.isFeatured && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              Featured
                            </span>
                          )}
                          {product.isNewArrival && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                              <Sparkles className="h-2.5 w-2.5 text-blue-600" />
                              New
                            </span>
                          )}
                          {product.isOnSale && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                              <Tag className="h-2.5 w-2.5 text-rose-600" />
                              Sale
                            </span>
                          )}
                          {!product.isFeatured &&
                            !product.isNewArrival &&
                            !product.isOnSale && (
                              <span className="text-[11px] text-neutral-400">—</span>
                            )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <ProductStatusBadge status={product.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/admin/products/${product.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 px-2.5">
                              <Edit2 className="h-3.5 w-3.5" />
                              <span className="ml-1">Edit</span>
                            </Button>
                          </Link>

                          {product.status !== "archived" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-neutral-600"
                              onClick={() => handleTogglePublish(product)}
                              title={
                                product.status === "active"
                                  ? "Unpublish to draft"
                                  : "Publish to storefront"
                              }
                            >
                              {product.status === "active" ? "Unpublish" : "Publish"}
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setModalProduct(product);
                              setIsArchiveModalOpen(true);
                            }}
                            className={`p-1.5 transition-colors ${
                              product.status === "archived"
                                ? "text-emerald-700 hover:text-emerald-900"
                                : "text-neutral-400 hover:text-rose-700"
                            }`}
                            title={
                              product.status === "archived"
                                ? "Restore product"
                                : "Archive product"
                            }
                          >
                            {product.status === "archived" ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {productsData.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-neutral-200 bg-neutral-50/50">
            <p className="text-xs text-neutral-500">
              Showing{" "}
              <strong className="font-semibold text-neutral-900">
                {(productsData.page - 1) * productsData.limit + 1}
              </strong>{" "}
              to{" "}
              <strong className="font-semibold text-neutral-900">
                {Math.min(
                  productsData.page * productsData.limit,
                  productsData.total
                )}
              </strong>{" "}
              of{" "}
              <strong className="font-semibold text-neutral-900">
                {productsData.total}
              </strong>{" "}
              results
            </p>

            <div className="flex items-center space-x-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                onClick={() => handlePageChange(productsData.page - 1)}
                disabled={productsData.page <= 1 || isLoading}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                <span>Prev</span>
              </Button>

              {Array.from({ length: productsData.totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const isCurrent = pageNum === productsData.page;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`h-8 w-8 text-xs font-mono font-medium transition-colors ${
                      isCurrent
                        ? "bg-neutral-950 text-white"
                        : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                onClick={() => handlePageChange(productsData.page + 1)}
                disabled={
                  productsData.page >= productsData.totalPages || isLoading
                }
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modalProduct && (
        <ArchiveConfirmModal
          isOpen={isArchiveModalOpen}
          onClose={() => {
            setIsArchiveModalOpen(false);
            setModalProduct(null);
          }}
          onConfirm={handleArchiveConfirm}
          productTitle={modalProduct.title}
          isArchived={modalProduct.status === "archived"}
          isLoading={isModalLoading}
        />
      )}
    </div>
  );
}
