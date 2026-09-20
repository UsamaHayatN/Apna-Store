import { productService } from "@/lib/products/product-service";
import { categoryService } from "@/lib/categories/category-service";
import { collectionService } from "@/lib/collections/collection-service";
import { Product } from "@/types";
import { siteConfig } from "@/config/site";

export interface StorefrontProductMedia {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface StorefrontProduct {
  id: string;
  title: string;
  slug: string;
  brand: string;
  modelCode?: string | null;
  shortDescription?: string | null;
  description: string;
  basePrice: number;
  compareAtPrice?: number | null;
  status: "active" | "draft" | "archived";
  isFeatured: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  primaryCategory?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  media: StorefrontProductMedia[];
  variantCount?: number;
  hasVariants: boolean;
}

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  productCount?: number;
  path?: string | null;
}

export interface StorefrontCollectionWithProducts {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  productCount?: number;
  products: StorefrontProduct[];
}

export interface HomepageData {
  featuredCategories: StorefrontCategory[];
  featuredProducts: StorefrontProduct[];
  newArrivals: StorefrontProduct[];
  featuredCollection: StorefrontCollectionWithProducts | null;
}

/**
 * Strict customer-facing projection: strips sensitive business intelligence
 * (costPrice, inventory costs, supplier info, internal notes).
 */
export function toStorefrontProduct(product: Product): StorefrontProduct {
  const sortedMedia = [...(product.media || [])].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    brand: product.brand || siteConfig.brandName,
    modelCode: product.modelCode || null,
    shortDescription: product.shortDescription || null,
    description: product.description || "",
    basePrice: Number(product.basePrice) || 0,
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    status: product.status,
    isFeatured: Boolean(product.isFeatured),
    isNewArrival: Boolean(product.isNewArrival),
    isOnSale: Boolean(
      product.isOnSale ||
        (product.compareAtPrice && product.compareAtPrice > product.basePrice)
    ),
    primaryCategory: product.primaryCategory
      ? {
          id: product.primaryCategory.id,
          name: product.primaryCategory.name,
          slug: product.primaryCategory.slug,
        }
      : null,
    media: sortedMedia.map((m) => ({
      id: m.id,
      url: m.url,
      altText: m.altText || product.title,
      isPrimary: Boolean(m.isPrimary),
      sortOrder: m.sortOrder ?? 0,
    })),
    variantCount: product.variantCount ?? (product.variants?.length || 0),
    hasVariants: Boolean(product.hasVariants),
  };
}

class StorefrontService {
  /**
   * Retrieves active, featured, and prominent footwear categories for storefront display.
   */
  async getFeaturedCategories(limit: number = 4): Promise<StorefrontCategory[]> {
    try {
      const allCategories = await categoryService.listCategories({
        includeInactive: false,
        includeArchived: false,
      });

      // Filter for subcategories or featured categories (excluding the root container "men")
      const relevant = allCategories.filter(
        (c) =>
          c.slug !== "men" &&
          (c.isFeatured || c.parentId !== null || (c.level ?? 0) > 0)
      );

      // Prioritize featured, then sort order
      relevant.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return a.sortOrder - b.sortOrder;
      });

      const chosen = (relevant.length > 0 ? relevant : allCategories).slice(0, limit);

      return chosen.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl || null,
        imageAlt: c.imageAlt || `${c.name} Collection`,
        productCount: c.activeProductCount || c.productCount || 0,
        path: c.path || `/category/${c.slug}`,
      }));
    } catch (err) {
      console.error("StorefrontService.getFeaturedCategories failed:", err);
      return [];
    }
  }

  /**
   * Retrieves active featured products, with graceful fallback to recent active products.
   */
  async getFeaturedProducts(limit: number = 4): Promise<StorefrontProduct[]> {
    try {
      const res = await productService.getProducts({
        status: "active",
        featured: true,
        page: 1,
        limit,
        sort: "newest",
      });

      const items = res.data || res.items || [];
      let mapped = items.map(toStorefrontProduct);

      // If fewer than requested limit, fill with general active products
      if (mapped.length < limit) {
        const fallbackRes = await productService.getProducts({
          status: "active",
          page: 1,
          limit,
          sort: "newest",
        });
        const fallbackItems = fallbackRes.data || fallbackRes.items || [];
        const seenIds = new Set(mapped.map((p) => p.id));

        for (const item of fallbackItems) {
          if (!seenIds.has(item.id)) {
            mapped.push(toStorefrontProduct(item));
            seenIds.add(item.id);
            if (mapped.length >= limit) break;
          }
        }
      }

      return mapped.slice(0, limit);
    } catch (err) {
      console.error("StorefrontService.getFeaturedProducts failed:", err);
      return [];
    }
  }

  /**
   * Retrieves active new arrivals, sorted by newest release.
   */
  async getNewArrivals(limit: number = 4): Promise<StorefrontProduct[]> {
    try {
      const res = await productService.getProducts({
        status: "active",
        newArrival: true,
        page: 1,
        limit,
        sort: "newest",
      });

      const items = res.data || res.items || [];
      let mapped = items.map(toStorefrontProduct);

      if (mapped.length < limit) {
        const fallbackRes = await productService.getProducts({
          status: "active",
          page: 1,
          limit: limit + 2,
          sort: "newest",
        });
        const fallbackItems = fallbackRes.data || fallbackRes.items || [];
        const seenIds = new Set(mapped.map((p) => p.id));

        for (const item of fallbackItems) {
          if (!seenIds.has(item.id)) {
            mapped.push(toStorefrontProduct(item));
            seenIds.add(item.id);
            if (mapped.length >= limit) break;
          }
        }
      }

      return mapped.slice(0, limit);
    } catch (err) {
      console.error("StorefrontService.getNewArrivals failed:", err);
      return [];
    }
  }

  /**
   * Retrieves the current primary featured collection with its assigned products.
   */
  async getFeaturedCollection(): Promise<StorefrontCollectionWithProducts | null> {
    try {
      const collectionsRes = await collectionService.listCollections({
        status: "published",
        isFeatured: true,
        limit: 1,
      });

      const collection = (collectionsRes.data || collectionsRes.items || [])[0];
      if (!collection) {
        // Try any published collection as fallback
        const anyPublished = await collectionService.listCollections({
          status: "published",
          limit: 1,
        });
        const fallbackCol = (anyPublished.data || anyPublished.items || [])[0];
        if (!fallbackCol) return null;

        const assignedItems = await collectionService.getCollectionProducts(fallbackCol.id);
        const products: StorefrontProduct[] = [];
        for (const item of assignedItems.slice(0, 4)) {
          if (item.product && item.product.status === "active") {
            const fullProd = await productService.getProductById(item.productId);
            if (fullProd && fullProd.status === "active") {
              products.push(toStorefrontProduct(fullProd));
            }
          }
        }

        return {
          id: fallbackCol.id,
          title: fallbackCol.title,
          slug: fallbackCol.slug,
          description: fallbackCol.description,
          imageUrl: fallbackCol.imageUrl,
          imageAlt: fallbackCol.imageAlt,
          productCount: fallbackCol.productCount,
          products,
        };
      }

      const assignedItems = await collectionService.getCollectionProducts(collection.id);
      const products: StorefrontProduct[] = [];
      for (const item of assignedItems.slice(0, 4)) {
        if (item.product && item.product.status === "active") {
          const fullProd = await productService.getProductById(item.productId);
          if (fullProd && fullProd.status === "active") {
            products.push(toStorefrontProduct(fullProd));
          }
        }
      }

      return {
        id: collection.id,
        title: collection.title,
        slug: collection.slug,
        description: collection.description,
        imageUrl: collection.imageUrl,
        imageAlt: collection.imageAlt,
        productCount: collection.productCount,
        products,
      };
    } catch (err) {
      console.error("StorefrontService.getFeaturedCollection failed:", err);
      return null;
    }
  }

  /**
   * Clears storefront homepage and category cache
   */
  clearCache(): void {
    homepageCache = null;
  }

  /**
   * Aggregates all homepage datasets concurrently with server-side caching / performance.
   */
  async getHomepageData(): Promise<HomepageData> {
    const now = Date.now();
    if (homepageCache && now - homepageCache.timestamp < HOMEPAGE_CACHE_TTL) {
      return homepageCache.data;
    }

    const [featuredCategories, featuredProducts, newArrivals, featuredCollection] =
      await Promise.all([
        this.getFeaturedCategories(4),
        this.getFeaturedProducts(4),
        this.getNewArrivals(4),
        this.getFeaturedCollection(),
      ]);

    const data: HomepageData = {
      featuredCategories,
      featuredProducts,
      newArrivals,
      featuredCollection,
    };

    homepageCache = { timestamp: now, data };
    return data;
  }
}

let homepageCache: { timestamp: number; data: HomepageData } | null = null;
const HOMEPAGE_CACHE_TTL = 15_000;

export const storefrontService = new StorefrontService();
