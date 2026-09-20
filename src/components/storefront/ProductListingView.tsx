"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  ShoppingBag,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { StorefrontProduct } from "@/lib/storefront/storefront-service";
import { ProductCard, ProductBadgeType } from "@/components/storefront/ProductCard";
import {
  DiscoveryResult,
  DiscoverySortOption,
  DiscoveryFacetAttribute,
  ActiveFilterChip,
} from "@/lib/storefront/discovery-service";

/* 
  ==============================================================================
  PRODUCTION-GRADE PRODUCT DISCOVERY ARCHITECTURE (Phase 11)
  - Full-stack database discovery connected to PostgreSQL & memory catalog
  - Dynamic URL synchronization (?size=42&color=black&minPrice=100&sort=newest&page=1)
  - Generic Attribute Filtering (Sizes, Colors with Swatches, Fit, Material)
  - Responsive 3-to-4 Column Grid with Collapsible Sidebar & Mobile Drawer
  - Visual Filter Chips with Single-Click Removal & Instant State Sync
  - Server-side Pagination & Sort Options
  - Strict Minimalist Color Palette: #111111, #757575, #AAAAAA, #FFFFFF, #F5F5F5, #E5E5E5
  ==============================================================================
*/

export { DEFAULT_PLP_CATALOG } from "@/lib/storefront/default-catalog";
export type { EnrichedPLPProduct } from "@/lib/storefront/default-catalog";

export interface ProductListingViewProps {
  initialTitle?: string;
  subtitle?: string;
  initialCategorySlug?: string;
  initialCollectionSlug?: string;
  serverProducts?: StorefrontProduct[];
  discoveryResult?: DiscoveryResult;
  baseUrl?: string;
}

const COLOR_SWATCH_MAP: Record<string, string> = {
  black: "#111111",
  white: "#FDFCFA",
  cognac: "#8B4513",
  espresso: "#3D2314",
  navy: "#1B2A4A",
  blue: "#2563EB",
  olive: "#556B2F",
  green: "#166534",
  burgundy: "#800020",
  brown: "#5C3A21",
  grey: "#6B7280",
  gray: "#6B7280",
  beige: "#D2B48C",
  tan: "#D2B48C",
  red: "#DC2626",
};

export function ProductListingView({
  initialTitle = "Catalog",
  subtitle,
  initialCategorySlug,
  initialCollectionSlug,
  serverProducts,
  discoveryResult,
  baseUrl,
}: ProductListingViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeBaseUrl = baseUrl || pathname;

  // 1. Sidebar visibility toggle ("Hide Filters" / "Show Filters")
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // 2. Mobile filter drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // 3. Sort By dropdown state
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // 4. Accordion collapse states
  const [accordions, setAccordions] = useState<Record<string, boolean>>({
    categories: true,
    size: true,
    color: true,
    price: true,
    availability: true,
    features: true,
  });

  const toggleAccordion = (key: string) => {
    setAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // URL QUERY SYNC ENGINE
  // ---------------------------------------------------------------------------
  const updateQueryParams = (updates: Record<string, string | null | undefined>) => {
    const current = new URLSearchParams(searchParams?.toString() || "");

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === "") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }

    // Reset page to 1 whenever any filter other than page changes
    if (!("page" in updates)) {
      current.delete("page");
    }

    const newQueryString = current.toString();
    const destination = newQueryString ? `${activeBaseUrl}?${newQueryString}` : activeBaseUrl;

    startTransition(() => {
      router.push(destination, { scroll: false });
    });
  };

  // Helper to toggle a single value inside a comma-separated query param (e.g., size=42,43)
  const toggleMultiValueParam = (paramName: string, value: string) => {
    const currentStr = searchParams?.get(paramName) || "";
    const currentValues = currentStr
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);

    const valLower = value.toLowerCase().trim();
    let nextValues: string[];

    if (currentValues.includes(valLower)) {
      nextValues = currentValues.filter((v) => v !== valLower);
    } else {
      nextValues = [...currentValues, valLower];
    }

    updateQueryParams({
      [paramName]: nextValues.length > 0 ? nextValues.join(",") : null,
    });
  };

  // ---------------------------------------------------------------------------
  // EXTRACT ACTIVE FILTERS FROM URL / DISCOVERY RESULT
  // ---------------------------------------------------------------------------
  const currentSort = (searchParams?.get("sort") as DiscoverySortOption) || discoveryResult?.currentQuery.sort || "featured";
  const currentSearch = searchParams?.get("search") || searchParams?.get("q") || discoveryResult?.currentQuery.search || "";
  const currentMinPrice = searchParams?.get("minPrice") || (discoveryResult?.currentQuery.minPrice ? String(discoveryResult.currentQuery.minPrice) : "");
  const currentMaxPrice = searchParams?.get("maxPrice") || (discoveryResult?.currentQuery.maxPrice ? String(discoveryResult.currentQuery.maxPrice) : "");
  const inStockChecked = searchParams?.get("inStock") === "true" || discoveryResult?.currentQuery.inStock === true;
  const onSaleChecked = searchParams?.get("onSale") === "true" || discoveryResult?.currentQuery.onSale === true;
  const newArrivalChecked = searchParams?.get("newArrival") === "true" || discoveryResult?.currentQuery.newArrival === true;
  const featuredChecked = searchParams?.get("featured") === "true" || discoveryResult?.currentQuery.featured === true;

  // Resolved Products & Facets
  const products = useMemo(() => {
    if (discoveryResult?.products) {
      return discoveryResult.products;
    }
    if (serverProducts) {
      return serverProducts;
    }
    return [];
  }, [discoveryResult, serverProducts]);

  const facets = discoveryResult?.facets;
  const totalCount = discoveryResult?.total ?? products.length;
  const currentPage = discoveryResult?.page ?? 1;
  const totalPages = discoveryResult?.totalPages ?? 1;

  // Active Filter Chips
  const activeChips: ActiveFilterChip[] = useMemo(() => {
    if (discoveryResult?.activeChips) {
      return discoveryResult.activeChips;
    }

    const chips: ActiveFilterChip[] = [];
    if (currentSearch) {
      chips.push({ id: "search", paramName: "search", label: `"${currentSearch}"`, type: "search" });
    }
    if (inStockChecked) {
      chips.push({ id: "inStock", paramName: "inStock", label: "In Stock Only", type: "inStock" });
    }
    if (onSaleChecked) {
      chips.push({ id: "onSale", paramName: "onSale", label: "On Sale", type: "onSale" });
    }
    if (newArrivalChecked) {
      chips.push({ id: "newArrival", paramName: "newArrival", label: "New Arrivals", type: "newArrival" });
    }
    if (currentMinPrice || currentMaxPrice) {
      const pLabel = currentMinPrice && currentMaxPrice
        ? `$${currentMinPrice} – $${currentMaxPrice}`
        : currentMinPrice
        ? `Over $${currentMinPrice}`
        : `Under $${currentMaxPrice}`;
      chips.push({ id: "price", paramName: "price", label: pLabel, type: "price" });
    }

    return chips;
  }, [discoveryResult, currentSearch, inStockChecked, onSaleChecked, newArrivalChecked, currentMinPrice, currentMaxPrice]);

  // Remove individual active chip
  const handleRemoveChip = (chip: ActiveFilterChip) => {
    if (chip.type === "price") {
      updateQueryParams({ minPrice: null, maxPrice: null });
    } else if (chip.type === "attribute" && chip.value) {
      toggleMultiValueParam(chip.paramName, chip.value);
    } else {
      updateQueryParams({ [chip.paramName]: null });
    }
  };

  // Reset all active filters
  const handleResetAllFilters = () => {
    startTransition(() => {
      router.push(activeBaseUrl, { scroll: false });
    });
  };

  // Predefined price tier handler
  const handleSelectPriceRange = (min: number | null, max: number | null) => {
    updateQueryParams({
      minPrice: min !== null ? String(min) : null,
      maxPrice: max !== null ? String(max) : null,
    });
  };

  const sortLabelMap: Record<DiscoverySortOption, string> = {
    featured: "Featured",
    "price-asc": "Price: Low to High",
    "price-desc": "Price: High to Low",
    newest: "Newest Arrivals",
    oldest: "Classic Releases",
    "name-asc": "Alphabetical: A–Z",
    "name-desc": "Alphabetical: Z–A",
  };

  return (
    <div className="bg-[#FFFFFF] min-h-screen text-[#111111]">
      {/* 
        ========================================================================
        1. TOP UTILITY TOOLBAR & PAGE HEADER
        ========================================================================
        - Category Title & Count: Display category heading on the left with live item count (e.g., "New (24)" in #111111 bold text).
        - Right Actions Toolbar:
          * "Hide Filters" toggle button accompanied by a clean filter slider icon (#111111).
          * "Sort By" dropdown menu with chevron down arrow.
      */}
      <div className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-xs border-b border-[#E5E5E5] transition-all">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Category Heading & Live Item Count */}
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
                  {initialTitle}
                </h1>
                <span className="text-sm sm:text-base font-bold text-[#757575]">
                  ({totalCount})
                </span>
                {isPending && (
                  <span className="ml-2 inline-flex items-center text-xs font-semibold text-[#757575] animate-pulse">
                    Updating...
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="mt-1 text-xs text-[#757575] font-light max-w-xl">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Right: Actions Toolbar */}
            <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
              {/* Desktop "Hide Filters" / "Show Filters" Toggle Button */}
              <button
                type="button"
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#111111] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
                aria-label={isSidebarVisible ? "Hide filters column" : "Show filters column"}
              >
                <span>{isSidebarVisible ? "Hide Filters" : "Show Filters"}</span>
                <SlidersHorizontal className="h-4 w-4 text-[#111111]" />
              </button>

              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2 text-xs font-bold text-[#111111] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
                aria-label="Open mobile filter options"
              >
                <span>Filters</span>
                {activeChips.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#111111] text-[10px] font-bold text-[#FFFFFF]">
                    {activeChips.length}
                  </span>
                )}
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#111111]" />
              </button>

              {/* "Sort By" Dropdown Menu */}
              <div className="relative" ref={sortRef}>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#111111] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
                  aria-haspopup="listbox"
                  aria-expanded={isSortDropdownOpen}
                >
                  <span className="text-[#757575] font-normal">Sort:</span>
                  <span className="font-bold text-[#111111]">
                    {sortLabelMap[currentSort] || "Featured"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-[#111111] transition-transform duration-200 ${
                      isSortDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Options */}
                {isSortDropdownOpen && (
                  <div
                    role="listbox"
                    className="absolute right-0 mt-2 w-52 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] py-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    {[
                      { id: "featured", label: "Featured" },
                      { id: "newest", label: "Newest Arrivals" },
                      { id: "price-asc", label: "Price: Low to High" },
                      { id: "price-desc", label: "Price: High to Low" },
                      { id: "name-asc", label: "Alphabetical: A–Z" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          updateQueryParams({ sort: opt.id === "featured" ? null : opt.id });
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                          currentSort === opt.id
                            ? "bg-[#F5F5F5] font-bold text-[#111111]"
                            : "text-[#757575] hover:bg-[#F5F5F5] hover:text-[#111111]"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {currentSort === opt.id && <Check className="h-3.5 w-3.5 text-[#111111]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E5E5]">
              <span className="text-xs font-semibold text-[#757575] mr-1">Active:</span>

              {activeChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] px-3 py-1 text-xs font-semibold text-[#111111] hover:border-[#AAAAAA] transition-colors"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChip(chip)}
                    aria-label={`Remove filter ${chip.label}`}
                    className="text-[#757575] hover:text-[#111111] p-0.5 rounded-full hover:bg-[#E5E5E5] transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={handleResetAllFilters}
                className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-[#111111] hover:text-[#757575] underline underline-offset-4 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 
        ========================================================================
        MAIN BODY: COLLAPSIBLE SIDEBAR + PRODUCT GRID
        ========================================================================
      */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex gap-8 items-start">
          {/* 
            ====================================================================
            2. COLLAPSIBLE LEFT SIDEBAR FILTER ARCHITECTURE
            ====================================================================
          */}
          {isSidebarVisible && (
            <aside
              id="plp-left-sidebar"
              aria-label="Filter Catalog"
              className="hidden lg:block w-[260px] shrink-0 sticky top-28 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-[#E5E5E5]"
            >
              {/* Categories Navigation */}
              {facets?.categories && facets.categories.length > 0 && (
                <div className="pb-4">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("categories")}
                    className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#111111] py-1 cursor-pointer"
                  >
                    <span>Categories</span>
                    {accordions.categories ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {accordions.categories && (
                    <ul className="mt-2.5 space-y-1 text-xs font-medium text-[#111111]">
                      {facets.categories.map((cat) => {
                        const isCurrent =
                          searchParams?.get("category") === cat.slug ||
                          initialCategorySlug === cat.slug;
                        return (
                          <li key={cat.id}>
                            <button
                              type="button"
                              onClick={() => updateQueryParams({ category: isCurrent ? null : cat.slug })}
                              className={`w-full text-left py-1 transition-colors cursor-pointer flex items-center justify-between ${
                                isCurrent
                                  ? "font-bold text-[#111111] underline underline-offset-4"
                                  : "text-[#757575] hover:text-[#111111]"
                              }`}
                            >
                              <span>{cat.name}</span>
                              <span className="text-[11px] text-[#AAAAAA]">({cat.count})</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* Dynamic Generic Attributes (Sizes, Colors, etc.) */}
              {facets?.attributes.map((attr) => {
                const codeLower = attr.code.toLowerCase();
                const isSize = codeLower === "size";
                const isColor = codeLower === "color";
                const isOpen = accordions[codeLower] ?? true;

                return (
                  <div key={attr.code} className="border-t border-[#E5E5E5] pt-4">
                    <button
                      type="button"
                      onClick={() => toggleAccordion(codeLower)}
                      className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#111111] py-1 cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span>{attr.name}</span>
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {isOpen && (
                      <div className="mt-3">
                        {isSize ? (
                          /* Size Button Grid */
                          <div className="grid grid-cols-3 gap-1.5">
                            {attr.values.map((v) => {
                              const isSelected = v.selected;
                              return (
                                <button
                                  key={v.value}
                                  type="button"
                                  onClick={() => toggleMultiValueParam(attr.code, v.value)}
                                  className={`py-2 text-xs font-bold uppercase rounded-sm border transition-colors cursor-pointer ${
                                    isSelected
                                      ? "bg-[#111111] text-[#FFFFFF] border-[#111111]"
                                      : "bg-[#FFFFFF] text-[#111111] border-[#E5E5E5] hover:border-[#111111]"
                                  }`}
                                  title={`${v.label} (${v.count})`}
                                >
                                  {v.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : isColor ? (
                          /* Color Swatch Tiles */
                          <div className="space-y-2">
                            {attr.values.map((v) => {
                              const isSelected = v.selected;
                              const hex =
                                v.colorHex ||
                                COLOR_SWATCH_MAP[v.value.toLowerCase()] ||
                                "#757575";

                              return (
                                <button
                                  key={v.value}
                                  type="button"
                                  onClick={() => toggleMultiValueParam(attr.code, v.value)}
                                  className={`w-full flex items-center justify-between py-1.5 px-2 rounded-md transition-colors cursor-pointer text-left ${
                                    isSelected
                                      ? "bg-[#F5F5F5] font-bold text-[#111111]"
                                      : "text-[#757575] hover:bg-[#F5F5F5] hover:text-[#111111]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className="h-4 w-4 rounded-full border border-[#E5E5E5] shrink-0 shadow-xs"
                                      style={{ backgroundColor: hex }}
                                    />
                                    <span className="text-xs">{v.label}</span>
                                  </div>
                                  <span className="text-[11px] text-[#AAAAAA]">({v.count})</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* Standard Attribute Checkbox List */
                          <div className="space-y-2">
                            {attr.values.map((v) => (
                              <label
                                key={v.value}
                                className="flex items-center justify-between text-xs font-semibold text-[#111111] cursor-pointer group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={v.selected}
                                    onChange={() => toggleMultiValueParam(attr.code, v.value)}
                                    className="h-4 w-4 rounded-xs border border-[#AAAAAA] text-[#111111] accent-[#111111] cursor-pointer"
                                  />
                                  <span className="group-hover:text-[#757575] transition-colors">
                                    {v.label}
                                  </span>
                                </div>
                                <span className="text-[11px] text-[#AAAAAA]">({v.count})</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Price Filter Accordion */}
              <div className="border-t border-[#E5E5E5] pt-4">
                <button
                  type="button"
                  onClick={() => toggleAccordion("price")}
                  className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#111111] py-1 cursor-pointer"
                  aria-expanded={accordions.price}
                >
                  <span>Shop By Price</span>
                  {accordions.price ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {accordions.price && (
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "All Prices", min: null, max: null },
                      { label: "Under $100", min: null, max: 100 },
                      { label: "$100 – $200", min: 100, max: 200 },
                      { label: "$200 – $300", min: 200, max: 300 },
                      { label: "Over $300", min: 300, max: null },
                    ].map((tier) => {
                      const isSelected =
                        tier.min === null && tier.max === null
                          ? !currentMinPrice && !currentMaxPrice
                          : currentMinPrice === String(tier.min ?? "") &&
                            currentMaxPrice === String(tier.max ?? "");

                      return (
                        <button
                          key={tier.label}
                          type="button"
                          onClick={() => handleSelectPriceRange(tier.min, tier.max)}
                          className={`w-full flex items-center justify-between py-1 text-xs transition-colors cursor-pointer text-left ${
                            isSelected
                              ? "font-bold text-[#111111] underline underline-offset-4"
                              : "text-[#757575] hover:text-[#111111]"
                          }`}
                        >
                          <span>{tier.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-[#111111]" />}
                        </button>
                      );
                    })}

                    {/* Manual Min/Max Price Inputs */}
                    <div className="pt-2 flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-xs text-[#757575]">$</span>
                        <input
                          type="number"
                          placeholder="Min"
                          defaultValue={currentMinPrice}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateQueryParams({ minPrice: (e.target as HTMLInputElement).value || null });
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== currentMinPrice) {
                              updateQueryParams({ minPrice: e.target.value || null });
                            }
                          }}
                          className="w-full rounded-sm border border-[#E5E5E5] bg-[#FFFFFF] py-1.5 pl-6 pr-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                        />
                      </div>
                      <span className="text-xs text-[#757575]">–</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-xs text-[#757575]">$</span>
                        <input
                          type="number"
                          placeholder="Max"
                          defaultValue={currentMaxPrice}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateQueryParams({ maxPrice: (e.target as HTMLInputElement).value || null });
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== currentMaxPrice) {
                              updateQueryParams({ maxPrice: e.target.value || null });
                            }
                          }}
                          className="w-full rounded-sm border border-[#E5E5E5] bg-[#FFFFFF] py-1.5 pl-6 pr-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Availability & Special Offers Accordion */}
              <div className="border-t border-[#E5E5E5] pt-4 pb-6">
                <button
                  type="button"
                  onClick={() => toggleAccordion("availability")}
                  className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#111111] py-1 cursor-pointer"
                  aria-expanded={accordions.availability}
                >
                  <span>Availability & Offers</span>
                  {accordions.availability ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {accordions.availability && (
                  <div className="mt-3 space-y-2.5">
                    <label className="flex items-center justify-between text-xs font-semibold text-[#111111] cursor-pointer group">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={inStockChecked}
                          onChange={(e) => updateQueryParams({ inStock: e.target.checked ? "true" : null })}
                          className="h-4 w-4 rounded-xs border border-[#AAAAAA] text-[#111111] accent-[#111111] cursor-pointer"
                        />
                        <span className="group-hover:text-[#757575] transition-colors">
                          In Stock Only
                        </span>
                      </div>
                      {facets && <span className="text-[11px] text-[#AAAAAA]">({facets.quickCounts.inStock})</span>}
                    </label>

                    <label className="flex items-center justify-between text-xs font-semibold text-[#111111] cursor-pointer group">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={onSaleChecked}
                          onChange={(e) => updateQueryParams({ onSale: e.target.checked ? "true" : null })}
                          className="h-4 w-4 rounded-xs border border-[#AAAAAA] text-[#111111] accent-[#111111] cursor-pointer"
                        />
                        <span className="group-hover:text-[#757575] transition-colors">
                          On Sale
                        </span>
                      </div>
                      {facets && <span className="text-[11px] text-[#AAAAAA]">({facets.quickCounts.onSale})</span>}
                    </label>

                    <label className="flex items-center justify-between text-xs font-semibold text-[#111111] cursor-pointer group">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={newArrivalChecked}
                          onChange={(e) => updateQueryParams({ newArrival: e.target.checked ? "true" : null })}
                          className="h-4 w-4 rounded-xs border border-[#AAAAAA] text-[#111111] accent-[#111111] cursor-pointer"
                        />
                        <span className="group-hover:text-[#757575] transition-colors">
                          New Arrivals
                        </span>
                      </div>
                      {facets && <span className="text-[11px] text-[#AAAAAA]">({facets.quickCounts.newArrival})</span>}
                    </label>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* 
            ====================================================================
            3. EXACT PRODUCT GRID DECODING & CARD ANATOMY
            ====================================================================
          */}
          <main className="flex-1">
            {products.length > 0 ? (
              <>
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10 transition-all duration-300 ${
                    isSidebarVisible ? "lg:grid-cols-3" : "lg:grid-cols-4"
                  }`}
                >
                  {products.map((product, idx) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priority={idx < 4}
                    />
                  ))}
                </div>

                {/* Server-side Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-14 pt-8 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[#757575] font-medium">
                      Showing Page <span className="font-bold text-[#111111]">{currentPage}</span> of{" "}
                      <span className="font-bold text-[#111111]">{totalPages}</span> ({totalCount} total items)
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => updateQueryParams({ page: String(currentPage - 1) })}
                        className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                          currentPage <= 1
                            ? "text-[#CCCCCC] cursor-not-allowed"
                            : "text-[#111111] hover:bg-[#F5F5F5] border border-[#E5E5E5]"
                        }`}
                        aria-label="Previous Page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </button>

                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        // Show first, last, and window around current
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          Math.abs(pageNum - currentPage) <= 1
                        ) {
                          const isActive = pageNum === currentPage;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => updateQueryParams({ page: String(pageNum) })}
                              className={`h-9 w-9 rounded-full text-xs font-bold transition-colors ${
                                isActive
                                  ? "bg-[#111111] text-[#FFFFFF]"
                                  : "text-[#111111] hover:bg-[#F5F5F5] border border-[#E5E5E5]"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          pageNum === 2 && currentPage > 3 ||
                          pageNum === totalPages - 1 && currentPage < totalPages - 2
                        ) {
                          return (
                            <span key={pageNum} className="text-xs text-[#AAAAAA] px-1">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}

                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => updateQueryParams({ page: String(currentPage + 1) })}
                        className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                          currentPage >= totalPages
                            ? "text-[#CCCCCC] cursor-not-allowed"
                            : "text-[#111111] hover:bg-[#F5F5F5] border border-[#E5E5E5]"
                        }`}
                        aria-label="Next Page"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Zero State */
              <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-[#F5F5F5] p-12 sm:p-16 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-[#AAAAAA] stroke-1 mb-4" />
                <h3 className="text-base font-black uppercase tracking-tight text-[#111111]">
                  No Products Match Your Selected Filters
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#757575] max-w-md mx-auto">
                  Try clearing some filter criteria, adjusting price ranges, or searching for a different silhouette.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="inline-flex items-center gap-2 rounded-full bg-[#111111] text-[#FFFFFF] px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 
        ========================================================================
        MOBILE FILTER DRAWER (SLIDE-OVER MODAL)
        ========================================================================
      */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Canvas */}
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-[#FFFFFF] shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
              <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
                Filters ({totalCount})
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="rounded-full p-1 text-[#757575] hover:text-[#111111] transition-colors"
                aria-label="Close filters drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Filter Accordions */}
            <div className="py-4 space-y-6">
              {/* Dynamic Attributes */}
              {facets?.attributes.map((attr) => (
                <div key={attr.code} className="border-b border-[#E5E5E5] pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-2.5">
                    {attr.name}
                  </h4>
                  {attr.code.toLowerCase() === "size" ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {attr.values.map((v) => (
                        <button
                          key={v.value}
                          type="button"
                          onClick={() => toggleMultiValueParam(attr.code, v.value)}
                          className={`py-2 text-xs font-bold uppercase rounded-sm border transition-colors ${
                            v.selected
                              ? "bg-[#111111] text-[#FFFFFF] border-[#111111]"
                              : "bg-[#FFFFFF] text-[#111111] border-[#E5E5E5]"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attr.values.map((v) => (
                        <label key={v.value} className="flex items-center justify-between text-xs text-[#111111]">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={v.selected}
                              onChange={() => toggleMultiValueParam(attr.code, v.value)}
                              className="h-4 w-4 rounded-xs border border-[#AAAAAA] accent-[#111111]"
                            />
                            <span>{v.label}</span>
                          </div>
                          <span className="text-[11px] text-[#AAAAAA]">({v.count})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Price */}
              <div className="border-b border-[#E5E5E5] pb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-2">
                  Price
                </h4>
                <div className="space-y-2">
                  {[
                    { label: "Under $100", min: null, max: 100 },
                    { label: "$100 – $200", min: 100, max: 200 },
                    { label: "$200 – $300", min: 200, max: 300 },
                    { label: "Over $300", min: 300, max: null },
                  ].map((tier) => (
                    <button
                      key={tier.label}
                      type="button"
                      onClick={() => handleSelectPriceRange(tier.min, tier.max)}
                      className="w-full text-left py-1 text-xs text-[#757575] hover:text-[#111111]"
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Action Footer */}
            <div className="mt-auto border-t border-[#E5E5E5] pt-4 flex gap-2">
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="flex-1 rounded-full border border-[#E5E5E5] bg-[#FFFFFF] py-3 text-xs font-bold uppercase tracking-wider text-[#111111] hover:bg-[#F5F5F5]"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex-1 rounded-full bg-[#111111] py-3 text-xs font-bold uppercase tracking-wider text-[#FFFFFF] hover:bg-neutral-800"
              >
                Apply ({totalCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
