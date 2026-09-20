import { productService } from "@/lib/products/product-service";
import { variantService } from "@/lib/products/variant-service";
import { attributeService } from "@/lib/products/attribute-service";
import { toStorefrontProduct, StorefrontProduct } from "@/lib/storefront/storefront-service";
import { DEFAULT_PLP_CATALOG, ProductBadgeType } from "@/lib/storefront/default-catalog";
import type {
  ColorwayOption,
  SizeOption,
  ReviewItem,
} from "@/components/storefront/ProductDetailView";

export interface PdpVariant {
  id: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  isOnSale: boolean;
  attributes: Record<string, string>; // e.g. { color: "black", size: "42" }
  images: string[];
  inStock: boolean;
  isLowStock: boolean;
  availableQuantity?: number;
}

export interface PdpAttributeOption {
  value: string;
  label: string;
  colorHex?: string | null;
}

export interface PdpAttribute {
  code: string;
  name: string;
  type: "color_swatch" | "button_pill" | "select" | "text";
  options: PdpAttributeOption[];
}

export interface PdpBreadcrumb {
  label: string;
  href: string;
}

export interface PdpProductDetail extends StorefrontProduct {
  styleCode?: string;
  badgeType: ProductBadgeType;
  customCategoryTag: string;
  attributes: PdpAttribute[];
  variants: PdpVariant[];
  breadcrumbs: PdpBreadcrumb[];
  specifications: { label: string; value: string }[];
  inStock: boolean;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage?: string;
  };
  gender?: "men" | "women" | "unisex";
  height?: string;
  sport?: string;
  colorways?: ColorwayOption[];
  sizes?: SizeOption[];
  materials?: string[];
  reviews?: ReviewItem[];
}

const pdpCache = new Map<string, { timestamp: number; data: PdpProductDetail | null }>();
const PDP_CACHE_TTL = 30_000; // 30 seconds

export const pdpService = {
  /**
   * Clears PDP memory cache
   */
  clearCache(): void {
    pdpCache.clear();
  },

  /**
   * Loads product detail for the storefront with full generic attribute matrix
   * and inventory-aware variant combinations.
   */
  async getPdpProduct(slug: string): Promise<PdpProductDetail | null> {
    const cacheKey = slug.toLowerCase().trim();
    const cached = pdpCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < PDP_CACHE_TTL) {
      return cached.data;
    }

    // 1. Attempt to load from database / product-service
    const dbProduct = await productService.getProductBySlug(slug);

    // 2. If not in DB, search catalog fallback
    const catalogMatch = !dbProduct
      ? DEFAULT_PLP_CATALOG.find(
          (p) => p.slug.toLowerCase() === slug.toLowerCase() || p.id === slug
        )
      : null;

    if (!dbProduct && !catalogMatch) {
      return null;
    }

    // Must be active
    if (dbProduct && (dbProduct.status !== "active" || dbProduct.deletedAt)) {
      return null;
    }

    // Resolve Product ID and base fields
    const id = dbProduct ? dbProduct.id : catalogMatch!.id;
    const title = dbProduct ? dbProduct.title : catalogMatch!.title;
    const brand = dbProduct ? dbProduct.brand : catalogMatch!.brand;
    const basePrice = dbProduct ? dbProduct.basePrice : catalogMatch!.basePrice;
    const compareAtPrice = dbProduct
      ? dbProduct.compareAtPrice ?? null
      : catalogMatch!.compareAtPrice ?? null;
    const isOnSale = dbProduct ? dbProduct.isOnSale : catalogMatch!.isOnSale;
    const description =
      dbProduct?.description ||
      catalogMatch?.description ||
      "Masterfully crafted using premium materials, Goodyear welt construction, and refined hand-finishing.";
    const shortDescription =
      dbProduct?.shortDescription ||
      (catalogMatch ? `${catalogMatch.brand} ${catalogMatch.title}` : "");
    const modelCode = dbProduct?.modelCode || (catalogMatch ? `AT-${catalogMatch.id.toUpperCase()}` : "AT-001");
    const hasVariants = dbProduct ? dbProduct.hasVariants : true;

    // Resolve Badge
    let badgeType: ProductBadgeType = "none";
    if (isOnSale) badgeType = "extra-discount";
    else if (dbProduct?.isFeatured || catalogMatch?.isFeatured) badgeType = "best-seller";

    // Resolve Media
    const media: { id: string; url: string; altText?: string | null; isPrimary: boolean; sortOrder: number; variantId?: string | null }[] = [];
    if (dbProduct?.media && dbProduct.media.length > 0) {
      for (let idx = 0; idx < dbProduct.media.length; idx++) {
        const m = dbProduct.media[idx];
        media.push({
          id: m.id,
          url: m.url,
          altText: m.altText || title,
          isPrimary: m.isPrimary,
          sortOrder: m.sortOrder ?? idx,
          variantId: m.variantId,
        });
      }
    } else if (catalogMatch) {
      if (catalogMatch.media && catalogMatch.media.length > 0) {
        for (let idx = 0; idx < catalogMatch.media.length; idx++) {
          const m = catalogMatch.media[idx];
          media.push({
            id: m.id,
            url: m.url,
            altText: m.altText || title,
            isPrimary: m.isPrimary,
            sortOrder: m.sortOrder ?? idx,
          });
        }
      }
    }

    // Ensure at least one image exists
    if (media.length === 0) {
      media.push({
        id: `m-${id}-default`,
        url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80",
        altText: title,
        isPrimary: true,
        sortOrder: 0,
      });
    }

    // Resolve Variants & Inventory
    let rawVariants = dbProduct?.variants;
    if (!rawVariants || rawVariants.length === 0) {
      try {
        rawVariants = await variantService.listVariantsByProductId(id, { includeArchived: false });
      } catch (err) {
        console.warn("Failed to load variants for PDP:", err);
      }
    }

    // If still no variants in DB and catalog match has mock sizes/colorways, generate standard shoe/apparel variants
    if ((!rawVariants || rawVariants.length === 0) && hasVariants) {
      rawVariants = generateFallbackVariants(id, title, basePrice, compareAtPrice);
    }

    // Filter to active variants only and map to public PDP variants
    const activeVariants = (rawVariants || []).filter((v) => v.isActive && !v.deletedAt);

    const pdpVariants: PdpVariant[] = activeVariants.map((v) => {
      const available =
        v.availableQuantity !== undefined
          ? v.availableQuantity
          : v.stockQuantity !== undefined
          ? v.stockQuantity
          : 10;
      const effectivePrice = v.priceOverride ?? basePrice;
      const vCompareAt = v.compareAtPrice ?? compareAtPrice;
      const normalizedAttrs: Record<string, string> = {};
      if (v.attributes) {
        for (const [key, val] of Object.entries(v.attributes)) {
          if (val !== undefined && val !== null) {
            normalizedAttrs[key] = String(val);
          }
        }
      }

      return {
        id: v.id,
        sku: v.sku,
        title: v.title,
        price: effectivePrice,
        compareAtPrice: vCompareAt,
        isOnSale: vCompareAt ? vCompareAt > effectivePrice : isOnSale,
        attributes: normalizedAttrs,
        images: v.images || [],
        inStock: available > 0,
        isLowStock: available > 0 && available <= 5,
        availableQuantity: available,
      };
    });

    // Resolve Generic Attribute Definitions
    const pdpAttributes = buildAttributeMatrix(pdpVariants);

    // Breadcrumbs
    const categoryName = dbProduct?.primaryCategory?.name || catalogMatch?.primaryCategory?.name || "Footwear";
    const categorySlug = dbProduct?.primaryCategory?.slug || catalogMatch?.primaryCategory?.slug || "footwear";

    const breadcrumbs: PdpBreadcrumb[] = [
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
      { label: categoryName, href: `/category/${categorySlug}` },
      { label: title, href: `/product/${slug}` },
    ];

    const customCategoryTag = dbProduct?.primaryCategory?.name
      ? `${dbProduct.primaryCategory.name} / ${brand}`
      : `Men's ${categoryName} / ${brand}`;

    // Specs
    const specifications: { label: string; value: string }[] = [
      { label: "Brand", value: brand },
      { label: "Style Code", value: modelCode },
      { label: "Category", value: categoryName },
      { label: "Craftsmanship", value: "Goodyear Welted / Blake Stitch Construction" },
      { label: "Origin", value: "Handcrafted in Florence, Italy" },
      { label: "Lining", value: "Full-grain calfskin leather" },
    ];

    const overallInStock = hasVariants
      ? pdpVariants.some((v) => v.inStock)
      : (dbProduct?.stockCount ?? 10) > 0;

    const productDetail: PdpProductDetail = {
      id,
      slug,
      title,
      brand,
      modelCode,
      styleCode: modelCode || undefined,
      shortDescription,
      description,
      basePrice,
      compareAtPrice,
      status: (dbProduct?.status as "active" | "draft" | "archived") || "active",
      isFeatured: dbProduct?.isFeatured || catalogMatch?.isFeatured || false,
      isNewArrival: dbProduct?.isNewArrival || catalogMatch?.isNewArrival || false,
      isOnSale,
      badgeType,
      customCategoryTag,
      primaryCategory: dbProduct?.primaryCategory
        ? {
            id: dbProduct.primaryCategory.id,
            name: dbProduct.primaryCategory.name,
            slug: dbProduct.primaryCategory.slug,
          }
        : catalogMatch?.primaryCategory || null,
      hasVariants,
      variantCount: pdpVariants.length,
      media,
      attributes: pdpAttributes,
      variants: pdpVariants,
      breadcrumbs,
      specifications,
      inStock: overallInStock,
      colorways: undefined,
      sizes: undefined,
      materials: undefined,
      reviews: undefined,
      gender: catalogMatch?.gender,
      height: catalogMatch?.height,
      sport: catalogMatch?.sport,
      seo: {
        title: `${title} | ${brand}`,
        description: shortDescription || description.slice(0, 160),
        canonicalUrl: `/product/${slug}`,
        ogImage: media[0]?.url,
      },
    };

    pdpCache.set(cacheKey, { timestamp: now, data: productDetail });
    return productDetail;
  },

  /**
   * Resolve recommended products for cross-sell ("You Might Also Like")
   */
  async getRecommendedProducts(
    currentSlug: string,
    categorySlug?: string,
    limit: number = 4
  ): Promise<StorefrontProduct[]> {
    try {
      const dbProductsRes = await productService.getProducts({
        status: "active",
        category: categorySlug,
        limit: limit * 2,
      });

      const convertedDb = (dbProductsRes.data || []).map(toStorefrontProduct);
      const combined: StorefrontProduct[] = [...DEFAULT_PLP_CATALOG, ...convertedDb];

      const seen = new Set<string>();
      seen.add(currentSlug.toLowerCase());

      const results: StorefrontProduct[] = [];
      for (const item of combined) {
        const idKey = item.id.toLowerCase();
        const slugKey = item.slug.toLowerCase();
        if (!seen.has(idKey) && !seen.has(slugKey)) {
          seen.add(idKey);
          seen.add(slugKey);
          results.push(item);
          if (results.length >= limit) break;
        }
      }

      return results;
    } catch {
      return DEFAULT_PLP_CATALOG.filter(
        (p) => p.slug.toLowerCase() !== currentSlug.toLowerCase()
      ).slice(0, limit);
    }
  },
};

// =============================================================================
// HELPER: Build generic attribute matrix from variants
// =============================================================================

function buildAttributeMatrix(variants: PdpVariant[]): PdpAttribute[] {
  const attrKeys = new Set<string>();
  for (const v of variants) {
    for (const k of Object.keys(v.attributes)) {
      attrKeys.add(k);
    }
  }

  // Pre-sort common attributes: color first, then fit/style, then size/waist/length
  const sortedKeys = Array.from(attrKeys).sort((a, b) => {
    const order = ["color", "colour", "fit", "size", "waist", "length", "material"];
    const indexA = order.indexOf(a.toLowerCase());
    const indexB = order.indexOf(b.toLowerCase());
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const attributes: PdpAttribute[] = [];

  for (const key of sortedKeys) {
    const isColor = key.toLowerCase().includes("color") || key.toLowerCase().includes("colour");
    const isSelect = key.toLowerCase() === "length" || key.toLowerCase() === "inseam";

    const valueMap = new Map<string, PdpAttributeOption>();

    for (const v of variants) {
      const val = v.attributes[key];
      if (!val) continue;

      if (!valueMap.has(val.toLowerCase())) {
        const option: PdpAttributeOption = {
          value: val,
          label: formatAttributeLabel(key, val),
        };

        if (isColor) {
          option.colorHex = getColorHex(val);
        }

        valueMap.set(val.toLowerCase(), option);
      }
    }

    attributes.push({
      code: key,
      name: formatAttributeName(key),
      type: isColor ? "color_swatch" : isSelect ? "select" : "button_pill",
      options: Array.from(valueMap.values()),
    });
  }

  return attributes;
}

function formatAttributeName(code: string): string {
  const map: Record<string, string> = {
    color: "Color",
    colour: "Color",
    size: "Size",
    fit: "Fit",
    waist: "Waist Size",
    length: "Inseam Length",
    material: "Material",
  };
  return map[code.toLowerCase()] || code.charAt(0).toUpperCase() + code.slice(1);
}

function formatAttributeLabel(attributeCode: string, value: string): string {
  if (attributeCode.toLowerCase() === "size") {
    // If numeric e.g. "40", "42" => "EU 40", "EU 42"
    if (/^\d{2}$/.test(value)) {
      return `EU ${value}`;
    }
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getColorHex(colorName: string): string {
  const hexMap: Record<string, string> = {
    black: "#111111",
    onyx: "#1C1C1C",
    cognac: "#9E4717",
    brown: "#5C3317",
    espresso: "#3D2314",
    tan: "#D2B48C",
    navy: "#1A2E40",
    blue: "#1E3A8A",
    white: "#FFFFFF",
    cream: "#F5F5DC",
    suede: "#A87A51",
    grey: "#6B7280",
    gray: "#6B7280",
    olive: "#556B2F",
    burgundy: "#800020",
    oxblood: "#4A0E17",
  };
  return hexMap[colorName.toLowerCase()] || "#888888";
}

// Fallback variant generator for catalog items
function generateFallbackVariants(
  productId: string,
  productTitle: string,
  basePrice: number,
  compareAtPrice?: number | null
): import("@/types").ProductVariant[] {
  const isApparel =
    productTitle.toLowerCase().includes("jacket") ||
    productTitle.toLowerCase().includes("tee") ||
    productTitle.toLowerCase().includes("shirt") ||
    productTitle.toLowerCase().includes("hoodie");

  if (isApparel) {
    const sizes = ["S", "M", "L", "XL"];
    return sizes.map((s, idx) => ({
      id: `var-${productId}-${s.toLowerCase()}`,
      productId,
      sku: `${productId.toUpperCase().slice(0, 8)}-${s}`,
      combinationHash: `size:${s.toLowerCase()}`,
      title: `${productTitle} / Size ${s}`,
      priceOverride: null,
      compareAtPrice: compareAtPrice ?? null,
      isActive: true,
      attributes: { size: s },
      images: [],
      stockQuantity: idx === 3 ? 2 : 12,
      createdAt: new Date().toISOString(),
      availableQuantity: idx === 3 ? 2 : 12,
    }));
  }

  // Shoes default sizes (EU 40 - 45)
  const sizes = ["40", "41", "42", "43", "44", "45"];
  return sizes.map((s, idx) => ({
    id: `var-${productId}-${s}`,
    productId,
    sku: `${productId.toUpperCase().slice(0, 8)}-${s}`,
    combinationHash: `size:${s}`,
    title: `${productTitle} / EU ${s}`,
    priceOverride: null,
    compareAtPrice: compareAtPrice ?? null,
    isActive: true,
    attributes: { size: s },
    images: [],
    stockQuantity: idx === 4 ? 0 : idx === 3 ? 3 : 15,
    createdAt: new Date().toISOString(),
    availableQuantity: idx === 4 ? 0 : idx === 3 ? 3 : 15,
  }));
}
