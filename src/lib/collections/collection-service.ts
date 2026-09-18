import { eq, desc, asc, and, or, sql, isNull, isNotNull, inArray } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { collections, productCollections, products, productMedia, categories } from "@/lib/db/schema";
import { Collection, CollectionProductItem, PaginatedResult } from "@/types";
import { CreateCollectionInput, UpdateCollectionInput } from "@/lib/validation/collection";
import { recordAuditLog } from "@/lib/audit";
import { generateSlug } from "@/lib/utils/slug";

// In-memory fallback collection store for development / preview
declare global {
  // eslint-disable-next-line no-var
  var _memoryCollections: Collection[] | undefined;
  // eslint-disable-next-line no-var
  var _memoryProductCollections: Array<{ productId: string; collectionId: string; sortOrder: number; addedAt: string }> | undefined;
}

const SEED_COLLECTIONS: Collection[] = [
  {
    id: "col-heritage-01",
    title: "The Heritage Benchmark",
    slug: "heritage-benchmark",
    description: "Handcrafted Goodyear-welted Oxfords, Chelsea boots, and archival dress footwear constructed from premier French calfskin.",
    imageUrl: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop",
    imageAlt: "The Heritage Benchmark Collection",
    isPublished: true,
    isFeatured: true,
    sortOrder: 1,
    seoTitle: "The Heritage Benchmark Collection | Atelier Footwear",
    seoDescription: "Explore iconic Goodyear-welted French calfskin shoes crafted using historic benchcraft traditions.",
    productCount: 2,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "col-summer-02",
    title: "Summer Riviera Capsule",
    slug: "summer-riviera",
    description: "Unlined suede penny loafers, driving moccasins, and breathable Mediterranean leisurewear.",
    imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Summer Riviera Footwear Capsule",
    isPublished: true,
    isFeatured: true,
    sortOrder: 2,
    seoTitle: "Summer Riviera Capsule | Lightweight Suede Loafers",
    seoDescription: "Slip into relaxed Italian suede loafers and lightweight footwear engineered for warm weather ease.",
    productCount: 1,
    deletedAt: null,
    createdAt: "2026-02-15T00:00:00.000Z",
    updatedAt: "2026-02-15T00:00:00.000Z",
  },
  {
    id: "col-urban-03",
    title: "Modern Sartorial City",
    slug: "modern-sartorial-city",
    description: "Monochrome leather sneakers and hybrid commando-sole brogues for contemporary metropolitan commute.",
    imageUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Modern Sartorial City Collection",
    isPublished: true,
    isFeatured: true,
    sortOrder: 3,
    seoTitle: "Modern Sartorial City Collection | Atelier",
    seoDescription: "Contemporary hybrid dress shoes and minimalist low-top leather sneakers.",
    productCount: 4,
    deletedAt: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
];

function initializeMemoryCollections(): Collection[] {
  if (!global._memoryCollections) {
    global._memoryCollections = [...SEED_COLLECTIONS];
  }
  return global._memoryCollections;
}

function initializeMemoryProductCollections(): Array<{ productId: string; collectionId: string; sortOrder: number; addedAt: string }> {
  if (!global._memoryProductCollections) {
    global._memoryProductCollections = [
      {
        productId: "prod-oxford-001",
        collectionId: "col-heritage-01",
        sortOrder: 1,
        addedAt: "2026-01-05T00:00:00.000Z",
      },
      {
        productId: "prod-boot-002",
        collectionId: "col-heritage-01",
        sortOrder: 2,
        addedAt: "2026-01-06T00:00:00.000Z",
      },
      {
        productId: "prod-boot-008",
        collectionId: "col-heritage-01",
        sortOrder: 3,
        addedAt: "2026-01-10T00:00:00.000Z",
      },
      {
        productId: "prod-dress-010",
        collectionId: "col-heritage-01",
        sortOrder: 4,
        addedAt: "2026-01-12T00:00:00.000Z",
      },
      {
        productId: "prod-dress-020",
        collectionId: "col-heritage-01",
        sortOrder: 5,
        addedAt: "2026-01-22T00:00:00.000Z",
      },
      {
        productId: "prod-sneaker-003",
        collectionId: "col-summer-02",
        sortOrder: 1,
        addedAt: "2026-02-16T00:00:00.000Z",
      },
      {
        productId: "prod-loafer-004",
        collectionId: "col-summer-02",
        sortOrder: 2,
        addedAt: "2026-02-17T00:00:00.000Z",
      },
      {
        productId: "prod-lfr-011",
        collectionId: "col-summer-02",
        sortOrder: 3,
        addedAt: "2026-02-18T00:00:00.000Z",
      },
      {
        productId: "prod-casual-013",
        collectionId: "col-summer-02",
        sortOrder: 4,
        addedAt: "2026-02-19T00:00:00.000Z",
      },
      {
        productId: "prod-sandal-017",
        collectionId: "col-summer-02",
        sortOrder: 5,
        addedAt: "2026-02-20T00:00:00.000Z",
      },
      {
        productId: "prod-snk-009",
        collectionId: "col-urban-03",
        sortOrder: 1,
        addedAt: "2026-03-01T00:00:00.000Z",
      },
      {
        productId: "prod-snk-021",
        collectionId: "col-urban-03",
        sortOrder: 2,
        addedAt: "2026-03-02T00:00:00.000Z",
      },
      {
        productId: "prod-coat-006",
        collectionId: "col-urban-03",
        sortOrder: 3,
        addedAt: "2026-03-03T00:00:00.000Z",
      },
      {
        productId: "prod-knitwear-005",
        collectionId: "col-urban-03",
        sortOrder: 4,
        addedAt: "2026-03-04T00:00:00.000Z",
      },
    ];
  }
  return global._memoryProductCollections;
}

export interface ListCollectionsOptions {
  search?: string;
  status?: "all" | "published" | "draft" | "archived";
  isFeatured?: boolean;
  sort?: "title-asc" | "title-desc" | "products-desc" | "created-desc" | "sort-order";
  page?: number;
  limit?: number;
}

export class CollectionService {
  private getMemoryStore(): Collection[] {
    return initializeMemoryCollections();
  }

  private getMemoryJunction(): Array<{ productId: string; collectionId: string; sortOrder: number; addedAt: string }> {
    return initializeMemoryProductCollections();
  }

  /**
   * List collections with filters, pagination, and product counts.
   */
  async listCollections(options: ListCollectionsOptions = {}): Promise<PaginatedResult<Collection>> {
    const {
      search,
      status = "all",
      isFeatured,
      sort = "sort-order",
      page = 1,
      limit = 20,
    } = options;

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const conditions = [];

        if (status === "archived") {
          conditions.push(isNotNull(collections.deletedAt));
        } else {
          conditions.push(isNull(collections.deletedAt));
          if (status === "published") {
            conditions.push(eq(collections.isPublished, true));
          } else if (status === "draft") {
            conditions.push(eq(collections.isPublished, false));
          }
        }

        if (isFeatured !== undefined) {
          conditions.push(eq(collections.isFeatured, isFeatured));
        }

        if (search && search.trim()) {
          const term = `%${search.trim().toLowerCase()}%`;
          conditions.push(
            or(
              sql`LOWER(${collections.title}) LIKE ${term}`,
              sql`LOWER(${collections.slug}) LIKE ${term}`
            )
          );
        }

        // Count total
        const [totalCountRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(collections)
          .where(conditions.length > 0 ? and(...conditions) : undefined);
        const total = totalCountRow ? Number(totalCountRow.count) : 0;

        // Order clause
        let orderByClause = asc(collections.sortOrder);
        if (sort === "title-asc") orderByClause = asc(collections.title);
        else if (sort === "title-desc") orderByClause = desc(collections.title);
        else if (sort === "created-desc") orderByClause = desc(collections.createdAt);

        const rows = await db
          .select()
          .from(collections)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderByClause)
          .limit(limit)
          .offset((page - 1) * limit);

        // Get product counts for these collections
        const productCounts = await this.getCollectionProductCounts();

        const items: Collection[] = rows.map((r) => ({
          id: r.id,
          title: r.title,
          name: r.title,
          slug: r.slug,
          description: r.description,
          imageUrl: r.imageUrl,
          imageAlt: r.imageAlt,
          isPublished: r.isPublished,
          isFeatured: r.isFeatured,
          sortOrder: r.sortOrder,
          seoTitle: r.seoTitle,
          seoDescription: r.seoDescription,
          startsAt: r.startsAt ? r.startsAt.toISOString() : null,
          endsAt: r.endsAt ? r.endsAt.toISOString() : null,
          metadata: (r.metadata as Record<string, unknown>) || {},
          productCount: productCounts.get(r.id) || 0,
          deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));

        if (sort === "products-desc") {
          items.sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0));
        }

        return {
          data: items,
          items,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      } catch (err) {
        console.warn("Postgres listCollections failed, falling back to memory:", err);
      }
    }

    // In-memory fallback
    const store = this.getMemoryStore();
    const junction = this.getMemoryJunction();

    const productCounts = new Map<string, number>();
    for (const j of junction) {
      productCounts.set(j.collectionId, (productCounts.get(j.collectionId) || 0) + 1);
    }

    let filtered = store.filter((c) => {
      if (status === "archived") {
        if (!c.deletedAt) return false;
      } else {
        if (c.deletedAt) return false;
        if (status === "published" && !c.isPublished) return false;
        if (status === "draft" && c.isPublished) return false;
      }

      if (isFeatured !== undefined && c.isFeatured !== isFeatured) {
        return false;
      }

      if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(term);
        const matchSlug = c.slug.toLowerCase().includes(term);
        if (!matchTitle && !matchSlug) return false;
      }

      return true;
    });

    // Attach current counts
    filtered = filtered.map((c) => ({
      ...c,
      productCount: productCounts.get(c.id) || 0,
    }));

    // Sort
    filtered.sort((a, b) => {
      if (sort === "title-asc") return a.title.localeCompare(b.title);
      if (sort === "title-desc") return b.title.localeCompare(a.title);
      if (sort === "products-desc") return (b.productCount || 0) - (a.productCount || 0);
      if (sort === "created-desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.sortOrder - b.sortOrder;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      data: items,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves single collection by ID.
   */
  async getCollectionById(id: string): Promise<Collection | null> {
    if (!id) return null;

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const [row] = await db
          .select()
          .from(collections)
          .where(eq(collections.id, id))
          .limit(1);

        if (!row) return null;

        const counts = await this.getCollectionProductCounts();

        return {
          id: row.id,
          title: row.title,
          name: row.title,
          slug: row.slug,
          description: row.description,
          imageUrl: row.imageUrl,
          imageAlt: row.imageAlt,
          isPublished: row.isPublished,
          isFeatured: row.isFeatured,
          sortOrder: row.sortOrder,
          seoTitle: row.seoTitle,
          seoDescription: row.seoDescription,
          startsAt: row.startsAt ? row.startsAt.toISOString() : null,
          endsAt: row.endsAt ? row.endsAt.toISOString() : null,
          metadata: (row.metadata as Record<string, unknown>) || {},
          productCount: counts.get(row.id) || 0,
          deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        };
      } catch (err) {
        console.warn("Postgres getCollectionById failed, using memory:", err);
      }
    }

    const store = this.getMemoryStore();
    const col = store.find((c) => c.id === id);
    if (!col) return null;

    const junction = this.getMemoryJunction();
    const count = junction.filter((j) => j.collectionId === id).length;

    return {
      ...col,
      productCount: count,
    };
  }

  /**
   * Retrieves collection by slug.
   */
  async getCollectionBySlug(slug: string): Promise<Collection | null> {
    if (!slug) return null;
    const normalized = slug.trim().toLowerCase();

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const [row] = await db
          .select()
          .from(collections)
          .where(and(eq(collections.slug, normalized), isNull(collections.deletedAt)))
          .limit(1);

        if (row) {
          return this.getCollectionById(row.id);
        }
      } catch (err) {
        console.warn("Postgres getCollectionBySlug failed, using memory:", err);
      }
    }

    const store = this.getMemoryStore();
    const col = store.find((c) => c.slug.toLowerCase() === normalized && !c.deletedAt);
    if (!col) return null;
    return this.getCollectionById(col.id);
  }

  /**
   * Creates a new marketing collection.
   */
  async createCollection(input: CreateCollectionInput, userId?: string): Promise<Collection> {
    const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.title);

    // Slug uniqueness check
    const existing = await this.getCollectionBySlug(slug);
    if (existing) {
      throw new Error(`Collection slug "${slug}" is already taken.`);
    }

    const newId = `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const collectionRecord: Collection = {
      id: newId,
      title: input.title.trim(),
      name: input.title.trim(),
      slug,
      description: input.description || null,
      imageUrl: input.imageUrl || null,
      imageAlt: input.imageAlt || null,
      isPublished: input.isPublished ?? true,
      isFeatured: input.isFeatured ?? false,
      sortOrder: input.sortOrder ?? 0,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null,
      metadata: input.metadata || {},
      productCount: 0,
      deletedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const [inserted] = await db
          .insert(collections)
          .values({
            title: collectionRecord.title,
            slug: collectionRecord.slug,
            description: collectionRecord.description,
            imageUrl: collectionRecord.imageUrl,
            imageAlt: collectionRecord.imageAlt,
            isPublished: collectionRecord.isPublished,
            isFeatured: collectionRecord.isFeatured,
            sortOrder: collectionRecord.sortOrder,
            seoTitle: collectionRecord.seoTitle,
            seoDescription: collectionRecord.seoDescription,
            startsAt: collectionRecord.startsAt ? new Date(collectionRecord.startsAt) : null,
            endsAt: collectionRecord.endsAt ? new Date(collectionRecord.endsAt) : null,
            metadata: collectionRecord.metadata ?? {},
          })
          .returning();

        collectionRecord.id = inserted.id;
        collectionRecord.createdAt = inserted.createdAt.toISOString();
        collectionRecord.updatedAt = inserted.updatedAt.toISOString();
      } catch (err) {
        console.warn("Postgres insert collection failed, falling back to memory:", err);
      }
    }

    // Keep memory store synced
    const store = this.getMemoryStore();
    store.push(collectionRecord);

    // Audit log
    await recordAuditLog({
      userId: userId || null,
      action: "collections.create",
      entityType: "collection",
      entityId: collectionRecord.id,
      changes: { after: collectionRecord },
    });

    return collectionRecord;
  }

  /**
   * Updates an existing collection.
   */
  async updateCollection(id: string, input: UpdateCollectionInput, userId?: string): Promise<Collection> {
    const current = await this.getCollectionById(id);
    if (!current) {
      throw new Error(`Collection with ID "${id}" not found.`);
    }

    const targetSlug = input.slug ? generateSlug(input.slug) : current.slug;
    if (targetSlug !== current.slug) {
      const existing = await this.getCollectionBySlug(targetSlug);
      if (existing && existing.id !== id) {
        throw new Error(`Collection slug "${targetSlug}" is already in use.`);
      }
    }

    const nowIso = new Date().toISOString();
    const updatedRecord: Collection = {
      ...current,
      title: input.title !== undefined ? input.title.trim() : current.title,
      name: input.title !== undefined ? input.title.trim() : current.title,
      slug: targetSlug,
      description: input.description !== undefined ? input.description : current.description,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : current.imageUrl,
      imageAlt: input.imageAlt !== undefined ? input.imageAlt : current.imageAlt,
      isPublished: input.isPublished !== undefined ? input.isPublished : current.isPublished,
      isFeatured: input.isFeatured !== undefined ? input.isFeatured : current.isFeatured,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : current.sortOrder,
      seoTitle: input.seoTitle !== undefined ? input.seoTitle : current.seoTitle,
      seoDescription: input.seoDescription !== undefined ? input.seoDescription : current.seoDescription,
      startsAt: input.startsAt !== undefined ? input.startsAt : current.startsAt,
      endsAt: input.endsAt !== undefined ? input.endsAt : current.endsAt,
      metadata: input.metadata !== undefined ? input.metadata : current.metadata,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(collections)
          .set({
            title: updatedRecord.title,
            slug: updatedRecord.slug,
            description: updatedRecord.description,
            imageUrl: updatedRecord.imageUrl,
            imageAlt: updatedRecord.imageAlt,
            isPublished: updatedRecord.isPublished,
            isFeatured: updatedRecord.isFeatured,
            sortOrder: updatedRecord.sortOrder,
            seoTitle: updatedRecord.seoTitle,
            seoDescription: updatedRecord.seoDescription,
            startsAt: updatedRecord.startsAt ? new Date(updatedRecord.startsAt) : null,
            endsAt: updatedRecord.endsAt ? new Date(updatedRecord.endsAt) : null,
            metadata: updatedRecord.metadata ?? {},
            updatedAt: new Date(),
          })
          .where(eq(collections.id, id));
      } catch (err) {
        console.warn("Postgres update collection failed, falling back to memory:", err);
      }
    }

    const store = this.getMemoryStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx !== -1) {
      store[idx] = updatedRecord;
    }

    await recordAuditLog({
      userId: userId || null,
      action: "collections.update",
      entityType: "collection",
      entityId: id,
      changes: { before: current, after: updatedRecord },
    });

    return updatedRecord;
  }

  /**
   * Soft-deletes / archives a collection.
   */
  async archiveCollection(id: string, userId?: string): Promise<{ success: boolean; message: string }> {
    const current = await this.getCollectionById(id);
    if (!current) {
      throw new Error(`Collection with ID "${id}" not found.`);
    }

    const now = new Date();
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(collections)
          .set({
            deletedAt: now,
            isPublished: false,
            updatedAt: now,
          })
          .where(eq(collections.id, id));
      } catch (err) {
        console.warn("Postgres archive collection failed, using memory:", err);
      }
    }

    const store = this.getMemoryStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx !== -1) {
      store[idx].deletedAt = now.toISOString();
      store[idx].isPublished = false;
      store[idx].updatedAt = now.toISOString();
    }

    await recordAuditLog({
      userId: userId || null,
      action: "collections.delete",
      entityType: "collection",
      entityId: id,
      changes: { after: { action: "archive", title: current.title } },
    });

    return {
      success: true,
      message: `Collection "${current.title}" has been archived.`,
    };
  }

  /**
   * Restores an archived collection.
   */
  async restoreCollection(id: string, userId?: string): Promise<Collection> {
    const current = await this.getCollectionById(id);
    if (!current) {
      throw new Error(`Collection with ID "${id}" not found.`);
    }

    const now = new Date();
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(collections)
          .set({
            deletedAt: null,
            isPublished: true,
            updatedAt: now,
          })
          .where(eq(collections.id, id));
      } catch (err) {
        console.warn("Postgres restore collection failed, using memory:", err);
      }
    }

    const store = this.getMemoryStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx !== -1) {
      store[idx].deletedAt = null;
      store[idx].isPublished = true;
      store[idx].updatedAt = now.toISOString();
    }

    await recordAuditLog({
      userId: userId || null,
      action: "collections.update",
      entityType: "collection",
      entityId: id,
      changes: { after: { action: "restore", title: current.title } },
    });

    return (await this.getCollectionById(id))!;
  }

  /**
   * Retrieves products assigned to a collection with product details.
   */
  async getCollectionProducts(collectionId: string): Promise<CollectionProductItem[]> {
    if (!collectionId) return [];

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select({
            productId: productCollections.productId,
            collectionId: productCollections.collectionId,
            sortOrder: productCollections.sortOrder,
            addedAt: productCollections.addedAt,
            productTitle: products.title,
            productSlug: products.slug,
            productBrand: products.brand,
            productBasePrice: products.basePrice,
            productStatus: products.status,
            categoryName: categories.name,
          })
          .from(productCollections)
          .innerJoin(products, eq(productCollections.productId, products.id))
          .leftJoin(categories, eq(products.primaryCategoryId, categories.id))
          .where(and(eq(productCollections.collectionId, collectionId), isNull(products.deletedAt)))
          .orderBy(asc(productCollections.sortOrder), desc(productCollections.addedAt));

        // Get primary thumbnails
        const productIds = rows.map((r) => r.productId);
        const mediaMap = new Map<string, string>();
        if (productIds.length > 0) {
          const mediaRows = await db
            .select({ productId: productMedia.productId, url: productMedia.url, isPrimary: productMedia.isPrimary })
            .from(productMedia)
            .where(inArray(productMedia.productId, productIds));
          for (const m of mediaRows) {
            if (m.isPrimary || !mediaMap.has(m.productId)) {
              mediaMap.set(m.productId, m.url);
            }
          }
        }

        return rows.map((r) => ({
          productId: r.productId,
          collectionId: r.collectionId,
          sortOrder: r.sortOrder,
          addedAt: r.addedAt.toISOString(),
          product: {
            id: r.productId,
            title: r.productTitle,
            slug: r.productSlug,
            brand: r.productBrand,
            basePrice: Number(r.productBasePrice),
            status: r.productStatus,
            primaryCategoryName: r.categoryName || undefined,
            thumbnailUrl: mediaMap.get(r.productId) || null,
          },
        }));
      } catch (err) {
        console.warn("Postgres getCollectionProducts failed, falling back to memory:", err);
      }
    }

    // In-memory fallback
    const junction = this.getMemoryJunction();
    const matches = junction.filter((j) => j.collectionId === collectionId);

    // Fetch product details lazily
    try {
      const { productService } = await import("@/lib/products/product-service");
      const { data: allProducts } = await productService.getProducts({
        page: 1,
        limit: 100,
        sort: "newest",
        status: "all",
      });
      const productMap = new Map((allProducts || []).map((p) => [p.id, p]));

      return matches
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((j) => {
          const prod = productMap.get(j.productId);
          return {
            productId: j.productId,
            collectionId: j.collectionId,
            sortOrder: j.sortOrder,
            addedAt: j.addedAt,
            product: prod
              ? {
                  id: prod.id,
                  title: prod.title,
                  slug: prod.slug,
                  brand: prod.brand,
                  basePrice: prod.basePrice,
                  status: prod.status,
                  primaryCategoryName: prod.primaryCategory?.name,
                  thumbnailUrl: prod.media?.[0]?.url || null,
                }
              : undefined,
          };
        })
        .filter((item) => !!item.product);
    } catch {
      return [];
    }
  }

  /**
   * Adds a product to a collection, preventing duplicate assignments.
   */
  async addProductToCollection(collectionId: string, productId: string, sortOrder = 0, userId?: string): Promise<{ success: boolean }> {
    const col = await this.getCollectionById(collectionId);
    if (!col) {
      throw new Error(`Collection "${collectionId}" not found.`);
    }

    // Check duplicate membership
    const existingProducts = await this.getCollectionProducts(collectionId);
    if (existingProducts.some((p) => p.productId === productId)) {
      throw new Error("This product is already a member of this collection.");
    }

    const nowIso = new Date().toISOString();

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .insert(productCollections)
          .values({
            collectionId,
            productId,
            sortOrder,
            addedAt: new Date(),
          })
          .onConflictDoNothing();
      } catch (err) {
        console.warn("Postgres addProductToCollection failed, using memory:", err);
      }
    }

    const junction = this.getMemoryJunction();
    if (!junction.some((j) => j.collectionId === collectionId && j.productId === productId)) {
      junction.push({
        collectionId,
        productId,
        sortOrder,
        addedAt: nowIso,
      });
    }

    await recordAuditLog({
      userId: userId || null,
      action: "collections.add_product",
      entityType: "collection",
      entityId: collectionId,
      changes: { after: { collectionTitle: col.title, productId, sortOrder } },
    });

    return { success: true };
  }

  /**
   * Removes a product from a collection.
   */
  async removeProductFromCollection(collectionId: string, productId: string, userId?: string): Promise<{ success: boolean }> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .delete(productCollections)
          .where(and(eq(productCollections.collectionId, collectionId), eq(productCollections.productId, productId)));
      } catch (err) {
        console.warn("Postgres removeProductFromCollection failed, using memory:", err);
      }
    }

    const junction = this.getMemoryJunction();
    const idx = junction.findIndex((j) => j.collectionId === collectionId && j.productId === productId);
    if (idx !== -1) {
      junction.splice(idx, 1);
    }

    await recordAuditLog({
      userId: userId || null,
      action: "collections.remove_product",
      entityType: "collection",
      entityId: collectionId,
      changes: { after: { collectionId, productId } },
    });

    return { success: true };
  }

  /**
   * Batch reorders products within a collection.
   */
  async reorderCollectionProducts(collectionId: string, productIdsInOrder: string[], userId?: string): Promise<{ success: boolean }> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        for (let i = 0; i < productIdsInOrder.length; i++) {
          await db
            .update(productCollections)
            .set({ sortOrder: i + 1 })
            .where(
              and(
                eq(productCollections.collectionId, collectionId),
                eq(productCollections.productId, productIdsInOrder[i])
              )
            );
        }
      } catch (err) {
        console.warn("Postgres reorderCollectionProducts failed, using memory:", err);
      }
    }

    const junction = this.getMemoryJunction();
    for (let i = 0; i < productIdsInOrder.length; i++) {
      const match = junction.find((j) => j.collectionId === collectionId && j.productId === productIdsInOrder[i]);
      if (match) {
        match.sortOrder = i + 1;
      }
    }

    await recordAuditLog({
      userId: userId || null,
      action: "collections.reorder_products",
      entityType: "collection",
      entityId: collectionId,
      changes: { after: { count: productIdsInOrder.length } },
    });

    return { success: true };
  }

  /**
   * Aggregates product counts per collection.
   */
  private async getCollectionProductCounts(): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select({
            collectionId: productCollections.collectionId,
            count: sql<number>`count(*)::int`,
          })
          .from(productCollections)
          .groupBy(productCollections.collectionId);

        for (const r of rows) {
          map.set(r.collectionId, Number(r.count));
        }
        return map;
      } catch (err) {
        console.warn("Postgres getCollectionProductCounts failed:", err);
      }
    }

    const junction = this.getMemoryJunction();
    for (const j of junction) {
      map.set(j.collectionId, (map.get(j.collectionId) || 0) + 1);
    }

    return map;
  }
}

export const collectionService = new CollectionService();
