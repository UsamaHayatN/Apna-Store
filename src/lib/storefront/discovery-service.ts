import { eq, and, or, ilike, gte, lte, desc, asc, isNull, inArray, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import {
  products as productsTable,
  productVariants as variantsTable,
  inventoryLevels as inventoryTable,
  productCategories as productCategoriesTable,
  productCollections as productCollectionsTable,
  categories as categoriesTable,
  collections as collectionsTable,
  variantAttributeValues as variantAttributeValuesTable,
  attributeValues as attributeValuesTable,
  attributes as attributesTable,
  productMedia,
} from "@/lib/db/schema";
import { productService } from "@/lib/products/product-service";
import { categoryService } from "@/lib/categories/category-service";
import { collectionService } from "@/lib/collections/collection-service";
import { variantService } from "@/lib/products/variant-service";
import { attributeService } from "@/lib/products/attribute-service";
import { toStorefrontProduct, StorefrontProduct } from "@/lib/storefront/storefront-service";
import { Product, ProductVariant, Category } from "@/types";

export type DiscoverySortOption =
  | "featured"
  | "newest"
  | "oldest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc";

export interface DiscoveryQueryParams {
  search?: string;
  category?: string;       // slug or id
  collection?: string;     // slug or id
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  newArrival?: boolean;
  featured?: boolean;
  attributes?: Record<string, string[]>; // e.g. { size: ["42", "43"], color: ["black"] }
  sort?: DiscoverySortOption;
  page?: number;
  limit?: number;
}

export interface DiscoveryFacetValue {
  value: string;
  label: string;
  colorHex?: string | null;
  count: number;
  selected: boolean;
}

export interface DiscoveryFacetAttribute {
  code: string;
  name: string;
  type: string;
  values: DiscoveryFacetValue[];
}

export interface DiscoveryFacetCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
  selected: boolean;
}

export interface DiscoveryFacets {
  categories: DiscoveryFacetCategory[];
  attributes: DiscoveryFacetAttribute[];
  priceRange: {
    min: number;
    max: number;
  };
  quickCounts: {
    inStock: number;
    onSale: number;
    newArrival: number;
    featured: number;
  };
  totalCount: number;
}

export interface ActiveFilterChip {
  id: string;
  paramName: string;
  value?: string;
  label: string;
  type: "search" | "category" | "collection" | "price" | "inStock" | "onSale" | "newArrival" | "attribute";
}

export interface DiscoveryResult {
  products: StorefrontProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  facets: DiscoveryFacets;
  activeChips: ActiveFilterChip[];
  currentQuery: DiscoveryQueryParams;
}

/**
 * Standard known system query parameters to separate from dynamic attribute filters
 */
const SYSTEM_QUERY_KEYS = new Set([
  "search",
  "q",
  "category",
  "collection",
  "minPrice",
  "maxPrice",
  "inStock",
  "onSale",
  "newArrival",
  "featured",
  "sort",
  "page",
  "limit",
]);

// Ultra-fast memory cache for faceted discovery queries
const discoveryCache = new Map<string, { timestamp: number; data: DiscoveryResult }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

export class DiscoveryService {
  /**
   * Clears discovery memory cache
   */
  clearCache(): void {
    discoveryCache.clear();
  }
  /**
   * Normalizes raw Next.js searchParams into a typed DiscoveryQueryParams object.
   */
  parseQueryParams(rawParams: Record<string, string | string[] | undefined>): DiscoveryQueryParams {
    const query: DiscoveryQueryParams = {};

    // 1. Search term
    const searchVal = rawParams.search || rawParams.q;
    if (typeof searchVal === "string" && searchVal.trim()) {
      query.search = searchVal.trim();
    }

    // 2. Category
    if (typeof rawParams.category === "string" && rawParams.category.trim()) {
      query.category = rawParams.category.trim();
    }

    // 3. Collection
    if (typeof rawParams.collection === "string" && rawParams.collection.trim()) {
      query.collection = rawParams.collection.trim();
    }

    // 4. Price range
    if (rawParams.minPrice) {
      const parsed = parseFloat(Array.isArray(rawParams.minPrice) ? rawParams.minPrice[0] : rawParams.minPrice);
      if (!isNaN(parsed) && parsed >= 0) {
        query.minPrice = parsed;
      }
    }
    if (rawParams.maxPrice) {
      const parsed = parseFloat(Array.isArray(rawParams.maxPrice) ? rawParams.maxPrice[0] : rawParams.maxPrice);
      if (!isNaN(parsed) && parsed > 0) {
        query.maxPrice = parsed;
      }
    }

    // 5. Booleans
    const parseBool = (val: string | string[] | undefined): boolean | undefined => {
      if (!val) return undefined;
      const str = (Array.isArray(val) ? val[0] : val).toLowerCase().trim();
      return str === "true" || str === "1" || str === "yes";
    };

    if (parseBool(rawParams.inStock)) query.inStock = true;
    if (parseBool(rawParams.onSale)) query.onSale = true;
    if (parseBool(rawParams.newArrival)) query.newArrival = true;
    if (parseBool(rawParams.featured)) query.featured = true;

    // 6. Sort
    const sortVal = typeof rawParams.sort === "string" ? rawParams.sort.trim().toLowerCase() : undefined;
    const validSorts: DiscoverySortOption[] = [
      "featured",
      "newest",
      "oldest",
      "price-asc",
      "price-desc",
      "name-asc",
      "name-desc",
    ];
    if (sortVal) {
      // Map potential underscores to hyphens
      const normalizedSort = sortVal.replace("_", "-") as DiscoverySortOption;
      if (validSorts.includes(normalizedSort)) {
        query.sort = normalizedSort;
      }
    }
    if (!query.sort) {
      query.sort = "featured";
    }

    // 7. Pagination
    const pageVal = rawParams.page ? parseInt(Array.isArray(rawParams.page) ? rawParams.page[0] : rawParams.page, 10) : 1;
    query.page = !isNaN(pageVal) && pageVal > 0 ? pageVal : 1;

    const limitVal = rawParams.limit ? parseInt(Array.isArray(rawParams.limit) ? rawParams.limit[0] : rawParams.limit, 10) : 20;
    query.limit = !isNaN(limitVal) && limitVal > 0 ? Math.min(limitVal, 50) : 20;

    // 8. Generic Dynamic Attributes (size, color, fit, waist, length, etc.)
    const attributes: Record<string, string[]> = {};
    for (const [key, rawValue] of Object.entries(rawParams)) {
      if (SYSTEM_QUERY_KEYS.has(key) || !rawValue) continue;

      const values: string[] = [];
      if (Array.isArray(rawValue)) {
        for (const item of rawValue) {
          values.push(...item.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
        }
      } else if (typeof rawValue === "string") {
        values.push(...rawValue.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
      }

      if (values.length > 0) {
        attributes[key.toLowerCase()] = Array.from(new Set(values));
      }
    }

    if (Object.keys(attributes).length > 0) {
      query.attributes = attributes;
    }

    return query;
  }

  /**
   * Main entry point for storefront discovery querying.
   * Works seamlessly with PostgreSQL when configured and memory store otherwise.
   */
  async searchAndFilter(params: DiscoveryQueryParams): Promise<DiscoveryResult> {
    const cacheKey = JSON.stringify(params);
    const cached = discoveryCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    let result: DiscoveryResult;
    if (isDatabaseConfigured()) {
      try {
        // Timeout safety: if DB queries take > 12s, fall back to memory instead of hanging
        result = await Promise.race([
          this.searchAndFilterPostgres(params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Discovery DB query timed out (12s)")), 12_000)
          ),
        ]);
      } catch (err) {
        console.warn("PostgreSQL discovery search failed, falling back to memory:", err);
        result = await this.searchAndFilterMemory(params);
      }
    } else {
      result = await this.searchAndFilterMemory(params);
    }

    if (discoveryCache.size > 200) {
      const oldestKey = discoveryCache.keys().next().value;
      if (oldestKey) discoveryCache.delete(oldestKey);
    }
    discoveryCache.set(cacheKey, { timestamp: now, data: result });
    return result;
  }

  /**
   * Memory implementation for discovery filtering with generic attributes & facets.
   */
  private async searchAndFilterMemory(params: DiscoveryQueryParams): Promise<DiscoveryResult> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    // 1. Fetch raw catalog
    const allProductsResult = await productService.getProducts({
      status: "active",
      limit: 1000,
    });
    const catalog = allProductsResult.data.filter((p) => p.status === "active" && !p.deletedAt);

    // 2. Fetch all variants to power attribute matching and live inventory checking
    const allVariants: ProductVariant[] = [];
    for (const p of catalog) {
      const variants = await variantService.listVariantsByProductId(p.id);
      allVariants.push(...variants);
    }

    const variantsByProductId = new Map<string, ProductVariant[]>();
    for (const v of allVariants) {
      if (!variantsByProductId.has(v.productId)) {
        variantsByProductId.set(v.productId, []);
      }
      variantsByProductId.get(v.productId)!.push(v);
    }

    // 3. Resolve collection items if collection parameter is passed
    let collectionProductIds: Set<string> | null = null;
    if (params.collection) {
      const col = await collectionService.getCollectionBySlug(params.collection) ||
                  await collectionService.getCollectionById(params.collection);
      if (col) {
        const colItems = await collectionService.getCollectionProducts(col.id);
        collectionProductIds = new Set(colItems.map((ci) => ci.productId));
      } else {
        collectionProductIds = new Set();
      }
    }

    // 4. Resolve category parameter
    let targetCategoryIds: Set<string> | null = null;
    if (params.category) {
      const cat = await categoryService.getCategoryBySlug(params.category) ||
                  await categoryService.getCategoryById(params.category);
      if (cat) {
        targetCategoryIds = new Set([cat.id]);
        if (cat.children && cat.children.length > 0) {
          for (const child of cat.children) {
            targetCategoryIds.add(child.id);
          }
        }
      } else {
        targetCategoryIds = new Set();
      }
    }

    // 5. Apply Multi-Criteria Filters
    const filtered = catalog.filter((product) => {
      // Search term
      if (params.search && params.search.trim()) {
        const term = params.search.toLowerCase().trim();
        const inTitle = product.title.toLowerCase().includes(term);
        const inBrand = product.brand.toLowerCase().includes(term);
        const inDesc = product.description.toLowerCase().includes(term);
        const inModel = product.modelCode ? product.modelCode.toLowerCase().includes(term) : false;
        const inSlug = product.slug.toLowerCase().includes(term);
        if (!inTitle && !inBrand && !inDesc && !inModel && !inSlug) {
          return false;
        }
      }

      // Category filter
      if (targetCategoryIds) {
        const matchesPrimary = product.primaryCategoryId && targetCategoryIds.has(product.primaryCategoryId);
        const matchesSlug = product.primaryCategory && targetCategoryIds.has(product.primaryCategory.id);
        if (!matchesPrimary && !matchesSlug) {
          return false;
        }
      }

      // Collection filter
      if (collectionProductIds) {
        if (!collectionProductIds.has(product.id)) {
          return false;
        }
      }

      // Price filter
      if (params.minPrice !== undefined && product.basePrice < params.minPrice) {
        return false;
      }
      if (params.maxPrice !== undefined && product.basePrice > params.maxPrice) {
        return false;
      }

      // Flags
      if (params.onSale) {
        const isProductOnSale = product.isOnSale || (product.compareAtPrice && product.compareAtPrice > product.basePrice);
        if (!isProductOnSale) return false;
      }

      if (params.newArrival && !product.isNewArrival) {
        return false;
      }

      if (params.featured && !product.isFeatured) {
        return false;
      }

      // Variants lookup for stock and dynamic attributes
      const pVariants = variantsByProductId.get(product.id) || [];

      // Availability / In Stock filter
      if (params.inStock) {
        const hasStock = pVariants.some((v) => v.isActive && (v.stockQuantity ?? 0) > 0);
        if (!hasStock && (product.stockCount ?? 0) <= 0) {
          return false;
        }
      }

      // Dynamic generic attributes matching
      if (params.attributes && Object.keys(params.attributes).length > 0) {
        for (const [attrCode, selectedValues] of Object.entries(params.attributes)) {
          if (!selectedValues || selectedValues.length === 0) continue;

          // A product matches this attribute if at least one active variant has a matching attribute value
          const matchesAttribute = pVariants.some((variant) => {
            if (!variant.isActive) return false;
            const attrVal = variant.attributes?.[attrCode];
            if (!attrVal) return false;
            const normalized = String(attrVal).toLowerCase().trim();
            return selectedValues.includes(normalized);
          });

          if (!matchesAttribute) {
            return false;
          }
        }
      }

      return true;
    });

    // 6. Sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (params.sort) {
        case "price-asc":
          return a.basePrice - b.basePrice;
        case "price-desc":
          return b.basePrice - a.basePrice;
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name-asc":
          return a.title.localeCompare(b.title);
        case "name-desc":
          return b.title.localeCompare(a.title);
        case "featured":
        default:
          if (a.isFeatured !== b.isFeatured) {
            return a.isFeatured ? -1 : 1;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    // 7. Pagination
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = sorted.slice(startIndex, startIndex + limit);

    // 8. Transform to Storefront Products
    const storefrontProducts = paginatedItems.map((p) => {
      const pVariants = variantsByProductId.get(p.id) || [];
      const storefrontP = toStorefrontProduct(p);

      // Collect available sizes & colors
      const sizes = new Set<string>();
      const colors = new Map<string, string | undefined>();

      for (const v of pVariants) {
        if (!v.isActive) continue;
        if (v.attributes?.size) {
          sizes.add(String(v.attributes.size));
        }
        if (v.attributes?.color) {
          const colorName = String(v.attributes.color);
          colors.set(colorName, undefined);
        }
      }

      return {
        ...storefrontP,
        availableSizes: Array.from(sizes),
        availableColors: Array.from(colors.keys()).map((name) => ({ name })),
        inStock: pVariants.some((v) => (v.stockQuantity ?? 0) > 0) || (p.stockCount ?? 0) > 0,
      };
    });

    // 9. Calculate Facets
    const facets = await this.calculateFacetsMemory(catalog, allVariants, params);

    // 10. Generate Active Filter Chips
    const activeChips = this.generateActiveChips(params, facets);

    return {
      products: storefrontProducts,
      total,
      page,
      limit,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      facets,
      activeChips,
      currentQuery: params,
    };
  }

  /**
   * PostgreSQL implementation when database is configured.
   */
  private async searchAndFilterPostgres(params: DiscoveryQueryParams): Promise<DiscoveryResult> {
    const db = getDb();
    const page = params.page || 1;
    const limit = params.limit || 20;

    // Conditions array
    const conditions = [
      eq(productsTable.status, "active"),
      isNull(productsTable.deletedAt),
    ];

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(productsTable.title, term),
          ilike(productsTable.brand, term),
          ilike(productsTable.description, term),
          ilike(productsTable.modelCode, term),
          ilike(productsTable.slug, term)
        )!
      );
    }

    if (params.minPrice !== undefined) {
      conditions.push(gte(productsTable.basePrice, String(params.minPrice)));
    }
    if (params.maxPrice !== undefined) {
      conditions.push(lte(productsTable.basePrice, String(params.maxPrice)));
    }

    if (params.onSale) {
      conditions.push(
        or(
          eq(productsTable.isOnSale, true),
          sql`${productsTable.compareAtPrice} > ${productsTable.basePrice}`
        )!
      );
    }

    if (params.newArrival) {
      conditions.push(eq(productsTable.isNewArrival, true));
    }

    if (params.featured) {
      conditions.push(eq(productsTable.isFeatured, true));
    }

    // Category filter
    if (params.category) {
      // Avoid UUID comparison for slug strings — only compare with slug column
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.category);
      const [cat] = await db
        .select()
        .from(categoriesTable)
        .where(
          isUuid
            ? or(eq(categoriesTable.slug, params.category), eq(categoriesTable.id, params.category))!
            : eq(categoriesTable.slug, params.category)
        )
        .limit(1);

      if (cat) {
        // Find children categories
        const children = await db
          .select({ id: categoriesTable.id })
          .from(categoriesTable)
          .where(eq(categoriesTable.parentId, cat.id));

        const catIds = [cat.id, ...children.map((c) => c.id)];
        conditions.push(inArray(productsTable.primaryCategoryId, catIds));
      }
    }

    // Collection filter
    if (params.collection) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.collection);
      const [col] = await db
        .select()
        .from(collectionsTable)
        .where(
          isUuid
            ? or(eq(collectionsTable.slug, params.collection), eq(collectionsTable.id, params.collection))!
            : eq(collectionsTable.slug, params.collection)
        )
        .limit(1);

      if (col) {
        const colProdIds = await db
          .select({ productId: productCollectionsTable.productId })
          .from(productCollectionsTable)
          .where(eq(productCollectionsTable.collectionId, col.id));

        if (colProdIds.length > 0) {
          conditions.push(inArray(productsTable.id, colProdIds.map((cp) => cp.productId)));
        } else {
          conditions.push(sql`1=0`);
        }
      }
    }

    // In Stock filter
    if (params.inStock) {
      const inStockVariants = await db
        .select({ productId: variantsTable.productId })
        .from(variantsTable)
        .innerJoin(inventoryTable, eq(variantsTable.id, inventoryTable.variantId))
        .where(
          and(
            eq(variantsTable.isActive, true),
            sql`(${inventoryTable.stockQuantity} - ${inventoryTable.reservedQuantity}) > 0`
          )
        );

      const inStockProductIds = Array.from(new Set(inStockVariants.map((v) => v.productId)));
      if (inStockProductIds.length > 0) {
        conditions.push(inArray(productsTable.id, inStockProductIds));
      }
    }

    // Dynamic Generic Attributes filter
    if (params.attributes && Object.keys(params.attributes).length > 0) {
      for (const [attrCode, rawValues] of Object.entries(params.attributes)) {
        if (!rawValues || rawValues.length === 0) continue;

        const matchingVariants = await db
          .select({ productId: variantsTable.productId })
          .from(variantsTable)
          .innerJoin(variantAttributeValuesTable, eq(variantsTable.id, variantAttributeValuesTable.variantId))
          .innerJoin(attributesTable, eq(variantAttributeValuesTable.attributeId, attributesTable.id))
          .innerJoin(attributeValuesTable, eq(variantAttributeValuesTable.attributeValueId, attributeValuesTable.id))
          .where(
            and(
              eq(attributesTable.code, attrCode),
              inArray(sql`lower(${attributeValuesTable.value})`, rawValues.map((v) => v.toLowerCase())),
              eq(variantsTable.isActive, true)
            )
          );

        const matchingProductIds = Array.from(new Set(matchingVariants.map((m) => m.productId)));
        if (matchingProductIds.length > 0) {
          conditions.push(inArray(productsTable.id, matchingProductIds));
        } else {
          // No products matched this attribute condition
          conditions.push(sql`1=0`);
        }
      }
    }

    // Total Count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productsTable)
      .where(and(...conditions));

    const total = Number(countResult?.count ?? 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // Sorting Order
    let orderByClause;
    switch (params.sort) {
      case "price-asc":
        orderByClause = [asc(productsTable.basePrice)];
        break;
      case "price-desc":
        orderByClause = [desc(productsTable.basePrice)];
        break;
      case "newest":
        orderByClause = [desc(productsTable.createdAt)];
        break;
      case "oldest":
        orderByClause = [asc(productsTable.createdAt)];
        break;
      case "name-asc":
        orderByClause = [asc(productsTable.title)];
        break;
      case "name-desc":
        orderByClause = [desc(productsTable.title)];
        break;
      case "featured":
      default:
        orderByClause = [desc(productsTable.isFeatured), desc(productsTable.createdAt)];
        break;
    }

    // Query paginated products with media in a single batch (no N+1)
    const offset = (page - 1) * limit;
    const dbProducts = await db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset);

    const productIds = dbProducts.map((p) => p.id);

    // Batch-fetch media for ALL paginated products in ONE query (eliminates N+1)
    let mediaByProductId = new Map<string, Array<{ id: string; url: string; altText: string | null; isPrimary: boolean; sortOrder: number }>>();
    if (productIds.length > 0) {
      const allMedia = await db
        .select()
        .from(productMedia)
        .where(inArray(productMedia.productId, productIds))
        .orderBy(asc(productMedia.sortOrder));

      for (const m of allMedia) {
        if (!mediaByProductId.has(m.productId)) {
          mediaByProductId.set(m.productId, []);
        }
        mediaByProductId.get(m.productId)!.push({
          id: m.id,
          url: m.url,
          altText: m.altText,
          isPrimary: Boolean(m.isPrimary),
          sortOrder: m.sortOrder ?? 0,
        });
      }
    }

    // Batch-fetch variant counts for display (single query)
    let variantCountMap = new Map<string, number>();
    if (productIds.length > 0) {
      const variantCounts = await db
        .select({
          productId: variantsTable.productId,
          count: sql<number>`count(*)`,
        })
        .from(variantsTable)
        .where(inArray(variantsTable.productId, productIds))
        .groupBy(variantsTable.productId);
      for (const vc of variantCounts) {
        variantCountMap.set(vc.productId, Number(vc.count));
      }
    }

    // Batch-fetch category lookups for display (single query)
    const categoryIds = dbProducts.map((p) => p.primaryCategoryId).filter(Boolean) as string[];
    let categoryMap = new Map<string, { id: string; name: string; slug: string }>();
    if (categoryIds.length > 0) {
      const uniqueCatIds = Array.from(new Set(categoryIds));
      const cats = await db
        .select({ id: categoriesTable.id, name: categoriesTable.name, slug: categoriesTable.slug })
        .from(categoriesTable)
        .where(inArray(categoriesTable.id, uniqueCatIds));
      for (const c of cats) {
        categoryMap.set(c.id, c);
      }
    }

    // Map directly from DB rows — no individual product fetch
    const storefrontProducts: StorefrontProduct[] = dbProducts.map((p) => {
      const media = (mediaByProductId.get(p.id) || []).map((m) => ({
        id: m.id,
        url: m.url,
        altText: m.altText || p.title,
        isPrimary: m.isPrimary,
        sortOrder: m.sortOrder,
      }));
      const cat = p.primaryCategoryId ? categoryMap.get(p.primaryCategoryId) : null;

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        brand: p.brand || "Atelier",
        modelCode: p.modelCode || null,
        shortDescription: p.shortDescription || null,
        description: p.description || "",
        basePrice: Number(p.basePrice) || 0,
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        status: "active" as const,
        isFeatured: Boolean(p.isFeatured),
        isNewArrival: Boolean(p.isNewArrival),
        isOnSale: Boolean(p.isOnSale || (p.compareAtPrice && Number(p.compareAtPrice) > Number(p.basePrice))),
        primaryCategory: cat || null,
        media,
        variantCount: variantCountMap.get(p.id) || 0,
        hasVariants: Boolean(p.hasVariants),
      };
    });

    // Build facets using a lightweight DB aggregate query instead of loading everything
    const facets = await this.calculateFacetsPostgres(db, conditions, params);
    const activeChips = this.generateActiveChips(params, facets);

    return {
      products: storefrontProducts,
      total,
      page,
      limit,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      facets,
      activeChips,
      currentQuery: params,
    };
  }

  /**
   * Efficient PostgreSQL-native facet calculation using aggregate queries
   * instead of loading ALL products and variants into memory.
   */
  private async calculateFacetsPostgres(
    db: ReturnType<typeof getDb>,
    baseConditions: ReturnType<typeof and>[],
    params: DiscoveryQueryParams
  ): Promise<DiscoveryFacets> {
    // Run 3 queries in parallel: categories, category counts, and aggregates
    const [allCategories, categoryCounts, aggregates, inStockProducts] = await Promise.all([
      categoryService.listCategories({ includeInactive: false }),
      db
        .select({
          categoryId: productsTable.primaryCategoryId,
          count: sql<number>`count(*)`,
        })
        .from(productsTable)
        .where(and(eq(productsTable.status, "active"), isNull(productsTable.deletedAt)))
        .groupBy(productsTable.primaryCategoryId),
      // Combined aggregate: price range + quick counts in one query
      db
        .select({
          minPrice: sql<number>`coalesce(min(${productsTable.basePrice}), 0)`,
          maxPrice: sql<number>`coalesce(max(${productsTable.basePrice}), 1000)`,
          totalCount: sql<number>`count(*)`,
          onSaleCount: sql<number>`count(*) filter (where ${productsTable.isOnSale} = true or ${productsTable.compareAtPrice} > ${productsTable.basePrice})`,
          newArrivalCount: sql<number>`count(*) filter (where ${productsTable.isNewArrival} = true)`,
          featuredCount: sql<number>`count(*) filter (where ${productsTable.isFeatured} = true)`,
        })
        .from(productsTable)
        .where(and(eq(productsTable.status, "active"), isNull(productsTable.deletedAt)))
        .then(([row]) => row),
      // In stock count
      db
        .selectDistinct({ productId: variantsTable.productId })
        .from(variantsTable)
        .innerJoin(inventoryTable, eq(variantsTable.id, inventoryTable.variantId))
        .where(
          and(
            eq(variantsTable.isActive, true),
            sql`(${inventoryTable.stockQuantity} - ${inventoryTable.reservedQuantity}) > 0`
          )
        ),
    ]);

    const catCountMap = new Map<string, number>();
    for (const row of categoryCounts) {
      if (row.categoryId) catCountMap.set(row.categoryId, Number(row.count));
    }

    const categoriesFacet: DiscoveryFacetCategory[] = allCategories
      .filter((c) => (catCountMap.get(c.id) || 0) > 0 || c.parentId === null)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: catCountMap.get(c.id) || 0,
        selected: params.category === c.slug || params.category === c.id,
      }));

    const inStockCount = inStockProducts.length;

    // Generic Attributes facet — run all attribute queries in PARALLEL
    const systemAttributes = await attributeService.listAttributes();

    const attributeFacetResults = await Promise.all(
      systemAttributes.map(async (attr) => {
        const code = attr.code.toLowerCase();

        // Get attribute values with counts from DB directly
        const valueCounts = await db
          .select({
            value: sql<string>`lower(${attributeValuesTable.value})`,
            count: sql<number>`count(distinct ${variantsTable.productId})`,
          })
          .from(variantsTable)
          .innerJoin(variantAttributeValuesTable, eq(variantsTable.id, variantAttributeValuesTable.variantId))
          .innerJoin(attributesTable, eq(variantAttributeValuesTable.attributeId, attributesTable.id))
          .innerJoin(attributeValuesTable, eq(variantAttributeValuesTable.attributeValueId, attributeValuesTable.id))
          .where(and(
            eq(attributesTable.code, code),
            eq(variantsTable.isActive, true)
          ))
          .groupBy(attributeValuesTable.value);

        const valueCountMap = new Map<string, number>();
        for (const vc of valueCounts) {
          valueCountMap.set(vc.value, Number(vc.count));
        }

        const facetValues: DiscoveryFacetValue[] = [];
        const seenVals = new Set<string>();

        // Use seeded values if available
        if (attr.values && attr.values.length > 0) {
          for (const av of attr.values) {
            const valLower = av.value.toLowerCase().trim();
            seenVals.add(valLower);
            const count = valueCountMap.get(valLower) || 0;
            if (count > 0 || params.attributes?.[code]?.includes(valLower)) {
              facetValues.push({
                value: av.value,
                label: av.label || av.value,
                colorHex: av.colorHex,
                count,
                selected: params.attributes?.[code]?.includes(valLower) ?? false,
              });
            }
          }
        }

        // Add discovered values not in definition
        for (const [val, count] of valueCountMap.entries()) {
          if (!seenVals.has(val) && count > 0) {
            facetValues.push({
              value: val,
              label: val.charAt(0).toUpperCase() + val.slice(1),
              count,
              selected: params.attributes?.[code]?.includes(val) ?? false,
            });
          }
        }

        if (facetValues.length > 0) {
          return {
            code: attr.code,
            name: attr.name,
            type: attr.type,
            values: facetValues.sort((a, b) => {
              const numA = parseFloat(a.value);
              const numB = parseFloat(b.value);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return a.label.localeCompare(b.label);
            }),
          } as DiscoveryFacetAttribute;
        }
        return null;
      })
    );

    const attributesFacet = attributeFacetResults.filter(Boolean) as DiscoveryFacetAttribute[];

    return {
      categories: categoriesFacet,
      attributes: attributesFacet,
      priceRange: {
        min: Math.floor(Number(aggregates?.minPrice ?? 0)),
        max: Math.ceil(Number(aggregates?.maxPrice ?? 1000)),
      },
      quickCounts: {
        inStock: inStockCount,
        onSale: Number(aggregates?.onSaleCount ?? 0),
        newArrival: Number(aggregates?.newArrivalCount ?? 0),
        featured: Number(aggregates?.featuredCount ?? 0),
      },
      totalCount: Number(aggregates?.totalCount ?? 0),
    };
  }

  /**
   * Dynamically aggregates facet counts, categories, and attributes from current catalog.
   */
  private async calculateFacetsMemory(
    catalog: Product[],
    variants: ProductVariant[],
    params: DiscoveryQueryParams
  ): Promise<DiscoveryFacets> {
    // 1. Categories
    const allCategories = await categoryService.listCategories({ includeInactive: false });
    const categoryCounts = new Map<string, number>();

    for (const product of catalog) {
      if (product.primaryCategoryId) {
        categoryCounts.set(
          product.primaryCategoryId,
          (categoryCounts.get(product.primaryCategoryId) || 0) + 1
        );
      }
    }

    const categoriesFacet: DiscoveryFacetCategory[] = allCategories
      .filter((c) => (categoryCounts.get(c.id) || 0) > 0 || c.parentId === null)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: categoryCounts.get(c.id) || 0,
        selected: params.category === c.slug || params.category === c.id,
      }));

    // 2. Price range
    let minPrice = catalog.length > 0 ? catalog[0].basePrice : 0;
    let maxPrice = catalog.length > 0 ? catalog[0].basePrice : 1000;
    for (const p of catalog) {
      if (p.basePrice < minPrice) minPrice = p.basePrice;
      if (p.basePrice > maxPrice) maxPrice = p.basePrice;
    }

    // 3. Quick counts
    let inStockCount = 0;
    let onSaleCount = 0;
    let newArrivalCount = 0;
    let featuredCount = 0;

    const variantsByProdId = new Map<string, ProductVariant[]>();
    for (const v of variants) {
      if (!variantsByProdId.has(v.productId)) {
        variantsByProdId.set(v.productId, []);
      }
      variantsByProdId.get(v.productId)!.push(v);
    }

    for (const p of catalog) {
      const pVars = variantsByProdId.get(p.id) || [];
      const hasStock = pVars.some((v) => (v.stockQuantity ?? 0) > 0) || (p.stockCount ?? 0) > 0;
      if (hasStock) inStockCount++;
      if (p.isOnSale || (p.compareAtPrice && p.compareAtPrice > p.basePrice)) onSaleCount++;
      if (p.isNewArrival) newArrivalCount++;
      if (p.isFeatured) featuredCount++;
    }

    // 4. Generic Attributes inspection
    const systemAttributes = await attributeService.listAttributes();
    const attributesFacet: DiscoveryFacetAttribute[] = [];

    for (const attr of systemAttributes) {
      const code = attr.code.toLowerCase();
      const valueCountMap = new Map<string, number>();

      for (const variant of variants) {
        if (!variant.isActive) continue;
        const val = variant.attributes?.[code];
        if (val !== undefined && val !== null) {
          const strVal = String(val).toLowerCase().trim();
          valueCountMap.set(strVal, (valueCountMap.get(strVal) || 0) + 1);
        }
      }

      // Build values list from seeded values or discovered values
      const facetValues: DiscoveryFacetValue[] = [];
      const seenVals = new Set<string>();

      if (attr.values && attr.values.length > 0) {
        for (const av of attr.values) {
          const valLower = av.value.toLowerCase().trim();
          seenVals.add(valLower);
          const count = valueCountMap.get(valLower) || 0;
          if (count > 0 || params.attributes?.[code]?.includes(valLower)) {
            facetValues.push({
              value: av.value,
              label: av.label || av.value,
              colorHex: av.colorHex,
              count,
              selected: params.attributes?.[code]?.includes(valLower) ?? false,
            });
          }
        }
      }

      // Add any discovered values not in definition
      for (const [val, count] of valueCountMap.entries()) {
        if (!seenVals.has(val) && count > 0) {
          facetValues.push({
            value: val,
            label: val.charAt(0).toUpperCase() + val.slice(1),
            count,
            selected: params.attributes?.[code]?.includes(val) ?? false,
          });
        }
      }

      if (facetValues.length > 0) {
        attributesFacet.push({
          code: attr.code,
          name: attr.name,
          type: attr.type,
          values: facetValues.sort((a, b) => {
            // Numeric sort for shoe sizes
            const numA = parseFloat(a.value);
            const numB = parseFloat(b.value);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.label.localeCompare(b.label);
          }),
        });
      }
    }

    return {
      categories: categoriesFacet,
      attributes: attributesFacet,
      priceRange: {
        min: Math.floor(minPrice),
        max: Math.ceil(maxPrice),
      },
      quickCounts: {
        inStock: inStockCount,
        onSale: onSaleCount,
        newArrival: newArrivalCount,
        featured: featuredCount,
      },
      totalCount: catalog.length,
    };
  }

  /**
   * Generates active chips for visual pills with single-click removal.
   */
  private generateActiveChips(params: DiscoveryQueryParams, facets: DiscoveryFacets): ActiveFilterChip[] {
    const chips: ActiveFilterChip[] = [];

    // Search chip
    if (params.search) {
      chips.push({
        id: "search",
        paramName: "search",
        label: `"${params.search}"`,
        type: "search",
      });
    }

    // Category chip
    if (params.category) {
      const cat = facets.categories.find(
        (c) => c.slug === params.category || c.id === params.category
      );
      chips.push({
        id: "category",
        paramName: "category",
        value: params.category,
        label: cat ? cat.name : params.category,
        type: "category",
      });
    }

    // Price range chip
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      let label = "";
      if (params.minPrice !== undefined && params.maxPrice !== undefined) {
        label = `$${params.minPrice} – $${params.maxPrice}`;
      } else if (params.minPrice !== undefined) {
        label = `Over $${params.minPrice}`;
      } else if (params.maxPrice !== undefined) {
        label = `Under $${params.maxPrice}`;
      }
      chips.push({
        id: "price",
        paramName: "price",
        label,
        type: "price",
      });
    }

    // Availability chip
    if (params.inStock) {
      chips.push({
        id: "inStock",
        paramName: "inStock",
        label: "In Stock Only",
        type: "inStock",
      });
    }

    // On sale chip
    if (params.onSale) {
      chips.push({
        id: "onSale",
        paramName: "onSale",
        label: "On Sale",
        type: "onSale",
      });
    }

    // New arrival chip
    if (params.newArrival) {
      chips.push({
        id: "newArrival",
        paramName: "newArrival",
        label: "New Arrivals",
        type: "newArrival",
      });
    }

    // Dynamic Attributes chips
    if (params.attributes) {
      for (const [attrCode, values] of Object.entries(params.attributes)) {
        const attrFacet = facets.attributes.find((a) => a.code.toLowerCase() === attrCode.toLowerCase());
        const attrName = attrFacet?.name || attrCode.charAt(0).toUpperCase() + attrCode.slice(1);

        for (const val of values) {
          const valFacet = attrFacet?.values.find((v) => v.value.toLowerCase() === val.toLowerCase());
          const displayLabel = valFacet?.label || val;

          chips.push({
            id: `attr-${attrCode}-${val}`,
            paramName: attrCode,
            value: val,
            label: `${attrName}: ${displayLabel}`,
            type: "attribute",
          });
        }
      }
    }

    return chips;
  }
}

export const discoveryService = new DiscoveryService();
