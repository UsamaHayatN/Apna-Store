import { eq, desc, asc, and, or, sql, isNull, isNotNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { categories, products, productCategories } from "@/lib/db/schema";
import { Category } from "@/types";
import { CreateCategoryInput, UpdateCategoryInput } from "@/lib/validation/category";
import { recordAuditLog } from "@/lib/audit";
import { generateSlug } from "@/lib/utils/slug";
import { SEED_CATEGORIES } from "@/lib/products/product-service";

// In-memory fallback category store for development / test
declare global {
  // eslint-disable-next-line no-var
  var _memoryCategories: Category[] | undefined;
}

function initializeMemoryCategories(): Category[] {
  if (global._memoryCategories) {
    return global._memoryCategories;
  }

  const initial: Category[] = SEED_CATEGORIES.map((cat) => ({
    ...cat,
    imageAlt: `${cat.name} Collection`,
    level: cat.parentId ? 1 : 0,
    path: cat.parentId ? `/men/${cat.slug}` : `/${cat.slug}`,
    isFeatured: cat.slug === "dress-shoes" || cat.slug === "sneakers" || cat.slug === "boots",
    seoTitle: `${cat.name} | Luxury Men's Footwear & Apparel`,
    seoDescription: cat.description || `Discover handcrafted ${cat.name.toLowerCase()} tailored for modern gentlemen.`,
    metadata: {},
    productCount: 0,
    activeProductCount: 0,
    childrenCount: 0,
    deletedAt: null,
    createdAt: cat.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  global._memoryCategories = initial;
  return initial;
}

export interface ListCategoriesOptions {
  includeInactive?: boolean;
  includeArchived?: boolean;
  search?: string;
  parentId?: string | null;
}

export class CategoryService {
  private getMemoryStore(): Category[] {
    return initializeMemoryCategories();
  }

  /**
   * Flat listing of categories with computed product counts and children counts.
   * Optimized: computes children counts from the same result set (avoids extra DB query).
   */
  async listCategories(options: ListCategoriesOptions = {}): Promise<Category[]> {
    const {
      includeInactive = true,
      includeArchived = false,
      search,
      parentId,
    } = options;

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const conditions = [];

        if (!includeArchived) {
          conditions.push(isNull(categories.deletedAt));
        }
        if (!includeInactive) {
          conditions.push(eq(categories.isActive, true));
        }
        if (parentId !== undefined) {
          if (parentId === null) {
            conditions.push(isNull(categories.parentId));
          } else {
            conditions.push(eq(categories.parentId, parentId));
          }
        }
        if (search && search.trim()) {
          const term = `%${search.trim().toLowerCase()}%`;
          conditions.push(
            or(
              sql`LOWER(${categories.name}) LIKE ${term}`,
              sql`LOWER(${categories.slug}) LIKE ${term}`
            )
          );
        }

        const rows = await db
          .select()
          .from(categories)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(categories.level), asc(categories.sortOrder), asc(categories.name));

        // Get product counts (single query)
        const productCounts = await this.getProductCountsMap();

        // Compute children counts FROM the same rows — no extra DB query
        const childrenCountMap = new Map<string, number>();
        for (const r of rows) {
          if (r.parentId) {
            childrenCountMap.set(r.parentId, (childrenCountMap.get(r.parentId) || 0) + 1);
          }
        }

        return rows.map((r) => {
          const counts = productCounts.get(r.id) || { total: 0, active: 0 };
          return {
            id: r.id,
            parentId: r.parentId,
            name: r.name,
            slug: r.slug,
            description: r.description,
            imageUrl: r.imageUrl,
            imageAlt: r.imageAlt,
            level: r.level,
            path: r.path,
            sortOrder: r.sortOrder,
            isActive: r.isActive,
            isFeatured: r.isFeatured,
            seoTitle: r.seoTitle,
            seoDescription: r.seoDescription,
            metadata: (r.metadata as Record<string, unknown>) || {},
            productCount: counts.total,
            activeProductCount: counts.active,
            childrenCount: childrenCountMap.get(r.id) || 0,
            deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          };
        });
      } catch (err) {
        console.warn("Postgres listCategories query failed, falling back to in-memory store:", err);
      }
    }

    // In-memory fallback
    const store = this.getMemoryStore();
    const productCounts = await this.getProductCountsMap();

    // Compute children counts in memory
    const childrenCountMap = new Map<string, number>();
    for (const c of store) {
      if (!c.deletedAt && c.parentId) {
        childrenCountMap.set(c.parentId, (childrenCountMap.get(c.parentId) || 0) + 1);
      }
    }

    return store
      .filter((cat) => {
        if (!includeArchived && cat.deletedAt) return false;
        if (!includeInactive && !cat.isActive) return false;
        if (parentId !== undefined) {
          if (parentId === null && cat.parentId !== null && cat.parentId !== undefined) return false;
          if (parentId !== null && cat.parentId !== parentId) return false;
        }
        if (search && search.trim()) {
          const term = search.trim().toLowerCase();
          const matchName = cat.name.toLowerCase().includes(term);
          const matchSlug = cat.slug.toLowerCase().includes(term);
          if (!matchName && !matchSlug) return false;
        }
        return true;
      })
      .map((cat) => {
        const counts = productCounts.get(cat.id) || { total: 0, active: 0 };
        return {
          ...cat,
          productCount: counts.total,
          activeProductCount: counts.active,
          childrenCount: childrenCountMap.get(cat.id) || 0,
        };
      })
      .sort((a, b) => {
        if ((a.level ?? 0) !== (b.level ?? 0)) {
          return (a.level ?? 0) - (b.level ?? 0);
        }
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Builds full hierarchical tree of categories for tree view and nested navigation.
   */
  async getCategoryTree(options: { includeInactive?: boolean; includeArchived?: boolean } = {}): Promise<Category[]> {
    const flatList = await this.listCategories({
      includeInactive: options.includeInactive ?? true,
      includeArchived: options.includeArchived ?? false,
    });

    const categoryMap = new Map<string, Category>();
    for (const cat of flatList) {
      categoryMap.set(cat.id, { ...cat, children: [] });
    }

    const roots: Category[] = [];

    for (const cat of flatList) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parentNode = categoryMap.get(cat.parentId)!;
        node.parent = parentNode;
        parentNode.children = parentNode.children || [];
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort children recursively
    const sortNodes = (nodes: Category[]) => {
      nodes.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      });
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children);
        }
      }
    };

    sortNodes(roots);
    return roots;
  }

  /**
   * Retrieves a single category with parent, children, and product counts.
   */
  async getCategoryById(id: string): Promise<Category | null> {
    if (!id) return null;

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const [cat] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, id))
          .limit(1);

        if (!cat) return null;

        // Fetch parent
        let parent: Category | null = null;
        if (cat.parentId) {
          const [p] = await db.select().from(categories).where(eq(categories.id, cat.parentId)).limit(1);
          if (p) {
            parent = {
              id: p.id,
              parentId: p.parentId,
              name: p.name,
              slug: p.slug,
              sortOrder: p.sortOrder,
              isActive: p.isActive,
              createdAt: p.createdAt.toISOString(),
            };
          }
        }

        // Fetch children
        const childrenRows = await db
          .select()
          .from(categories)
          .where(and(eq(categories.parentId, cat.id), isNull(categories.deletedAt)))
          .orderBy(asc(categories.sortOrder), asc(categories.name));

        const productCounts = await this.getProductCountsMap();
        const counts = productCounts.get(cat.id) || { total: 0, active: 0 };

        return {
          id: cat.id,
          parentId: cat.parentId,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          imageUrl: cat.imageUrl,
          imageAlt: cat.imageAlt,
          level: cat.level,
          path: cat.path,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
          isFeatured: cat.isFeatured,
          seoTitle: cat.seoTitle,
          seoDescription: cat.seoDescription,
          metadata: (cat.metadata as Record<string, unknown>) || {},
          productCount: counts.total,
          activeProductCount: counts.active,
          childrenCount: childrenRows.length,
          deletedAt: cat.deletedAt ? cat.deletedAt.toISOString() : null,
          createdAt: cat.createdAt.toISOString(),
          updatedAt: cat.updatedAt.toISOString(),
          parent,
          children: childrenRows.map((c) => ({
            id: c.id,
            parentId: c.parentId,
            name: c.name,
            slug: c.slug,
            sortOrder: c.sortOrder,
            isActive: c.isActive,
            level: c.level,
            path: c.path,
            createdAt: c.createdAt.toISOString(),
          })),
        };
      } catch (err) {
        console.warn("Postgres getCategoryById failed, using memory:", err);
      }
    }

    const store = this.getMemoryStore();
    const cat = store.find((c) => c.id === id);
    if (!cat) return null;

    const parent = cat.parentId ? store.find((c) => c.id === cat.parentId) || null : null;
    const children = store.filter((c) => c.parentId === cat.id && !c.deletedAt);
    const productCounts = await this.getProductCountsMap();
    const counts = productCounts.get(cat.id) || { total: 0, active: 0 };

    return {
      ...cat,
      parent,
      children,
      childrenCount: children.length,
      productCount: counts.total,
      activeProductCount: counts.active,
    };
  }

  /**
   * Retrieves category by unique URL slug.
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    if (!slug) return null;
    const normalized = slug.trim().toLowerCase();

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const [cat] = await db
          .select()
          .from(categories)
          .where(and(eq(categories.slug, normalized), isNull(categories.deletedAt)))
          .limit(1);

        if (cat) {
          return this.getCategoryById(cat.id);
        }
      } catch (err) {
        console.warn("Postgres getCategoryBySlug failed, using memory:", err);
      }
    }

    const store = this.getMemoryStore();
    const cat = store.find((c) => c.slug.toLowerCase() === normalized && !c.deletedAt);
    if (!cat) return null;
    return this.getCategoryById(cat.id);
  }

  /**
   * Creates a new category with path & level computation and slug uniqueness.
   */
  async createCategory(input: CreateCategoryInput, userId?: string): Promise<Category> {
    const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);

    // 1. Slug uniqueness check
    const existing = await this.getCategoryBySlug(slug);
    if (existing) {
      throw new Error(`Category slug "${slug}" is already in use by another category.`);
    }

    // 2. Parent validation & hierarchy calculations
    let level = 0;
    let path = `/${slug}`;
    let parentCategory: Category | null = null;

    if (input.parentId) {
      parentCategory = await this.getCategoryById(input.parentId);
      if (!parentCategory) {
        throw new Error(`Parent category with ID "${input.parentId}" does not exist.`);
      }
      if (parentCategory.deletedAt) {
        throw new Error("Cannot assign an archived category as parent.");
      }
      level = (parentCategory.level ?? 0) + 1;
      path = `${parentCategory.path || `/${parentCategory.slug}`}/${slug}`;
    }

    const newId = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const categoryRecord: Category = {
      id: newId,
      parentId: input.parentId || null,
      name: input.name.trim(),
      slug,
      description: input.description || null,
      imageUrl: input.imageUrl || null,
      imageAlt: input.imageAlt || null,
      level,
      path,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      isFeatured: input.isFeatured ?? false,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      metadata: input.metadata || {},
      productCount: 0,
      activeProductCount: 0,
      childrenCount: 0,
      deletedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const [inserted] = await db
          .insert(categories)
          .values({
            parentId: categoryRecord.parentId,
            name: categoryRecord.name,
            slug: categoryRecord.slug,
            description: categoryRecord.description,
            imageUrl: categoryRecord.imageUrl,
            imageAlt: categoryRecord.imageAlt,
            level: categoryRecord.level ?? 0,
            path: categoryRecord.path,
            sortOrder: categoryRecord.sortOrder,
            isActive: categoryRecord.isActive,
            isFeatured: categoryRecord.isFeatured ?? false,
            seoTitle: categoryRecord.seoTitle,
            seoDescription: categoryRecord.seoDescription,
            metadata: categoryRecord.metadata ?? {},
          })
          .returning();

        categoryRecord.id = inserted.id;
        categoryRecord.createdAt = inserted.createdAt.toISOString();
        categoryRecord.updatedAt = inserted.updatedAt.toISOString();
      } catch (err) {
        console.warn("Postgres insert category failed, falling back to memory:", err);
      }
    }

    // Keep memory store synced
    const store = this.getMemoryStore();
    store.push(categoryRecord);

    // Audit log
    await recordAuditLog({
      userId: userId || null,
      action: "categories.create",
      entityType: "category",
      entityId: categoryRecord.id,
      changes: { after: categoryRecord },
    });

    return categoryRecord;
  }

  /**
   * Updates an existing category, with circular-reference detection and hierarchy cascading.
   */
  async updateCategory(id: string, input: UpdateCategoryInput, userId?: string): Promise<Category> {
    const current = await this.getCategoryById(id);
    if (!current) {
      throw new Error(`Category with ID "${id}" not found.`);
    }

    // Slug uniqueness check if changed
    const targetSlug = input.slug ? generateSlug(input.slug) : current.slug;
    if (targetSlug !== current.slug) {
      const existing = await this.getCategoryBySlug(targetSlug);
      if (existing && existing.id !== id) {
        throw new Error(`Category slug "${targetSlug}" is already taken.`);
      }
    }

    // Parent hierarchy validation & cycle prevention
    let targetParentId = input.parentId !== undefined ? input.parentId : current.parentId;
    if (targetParentId === "") targetParentId = null;

    if (targetParentId === id) {
      throw new Error("A category cannot be its own parent.");
    }

    let level = current.level ?? 0;
    let path = current.path ?? `/${targetSlug}`;

    if (targetParentId !== current.parentId) {
      if (targetParentId) {
        // Prevent assigning a descendant as the new parent (cycle prevention)
        const descendants = await this.getCategoryDescendantIds(id);
        if (descendants.includes(targetParentId)) {
          throw new Error("Cannot set a subcategory as parent: this would create an invalid circular hierarchy.");
        }

        const parentCategory = await this.getCategoryById(targetParentId);
        if (!parentCategory) {
          throw new Error(`Parent category "${targetParentId}" does not exist.`);
        }
        if (parentCategory.deletedAt) {
          throw new Error("Cannot assign an archived category as parent.");
        }

        level = (parentCategory.level ?? 0) + 1;
        path = `${parentCategory.path || `/${parentCategory.slug}`}/${targetSlug}`;
      } else {
        level = 0;
        path = `/${targetSlug}`;
      }
    } else if (targetSlug !== current.slug) {
      // Slug changed but parent stayed same: update path
      if (current.parentId) {
        const parent = await this.getCategoryById(current.parentId);
        path = `${parent?.path || ""}/${targetSlug}`;
      } else {
        path = `/${targetSlug}`;
      }
    }

    const nowIso = new Date().toISOString();
    const updatedRecord: Category = {
      ...current,
      parentId: targetParentId,
      name: input.name !== undefined ? input.name.trim() : current.name,
      slug: targetSlug,
      description: input.description !== undefined ? input.description : current.description,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : current.imageUrl,
      imageAlt: input.imageAlt !== undefined ? input.imageAlt : current.imageAlt,
      level,
      path,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : current.sortOrder,
      isActive: input.isActive !== undefined ? input.isActive : current.isActive,
      isFeatured: input.isFeatured !== undefined ? input.isFeatured : current.isFeatured,
      seoTitle: input.seoTitle !== undefined ? input.seoTitle : current.seoTitle,
      seoDescription: input.seoDescription !== undefined ? input.seoDescription : current.seoDescription,
      metadata: input.metadata !== undefined ? input.metadata : current.metadata,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(categories)
          .set({
            parentId: updatedRecord.parentId,
            name: updatedRecord.name,
            slug: updatedRecord.slug,
            description: updatedRecord.description,
            imageUrl: updatedRecord.imageUrl,
            imageAlt: updatedRecord.imageAlt,
            level: updatedRecord.level ?? 0,
            path: updatedRecord.path,
            sortOrder: updatedRecord.sortOrder,
            isActive: updatedRecord.isActive,
            isFeatured: updatedRecord.isFeatured ?? false,
            seoTitle: updatedRecord.seoTitle,
            seoDescription: updatedRecord.seoDescription,
            metadata: updatedRecord.metadata ?? {},
            updatedAt: new Date(),
          })
          .where(eq(categories.id, id));

        // Cascade path and level updates to all descendants if hierarchy changed
        if (targetParentId !== current.parentId || targetSlug !== current.slug) {
          await this.cascadeHierarchyUpdates(id, path, level);
        }
      } catch (err) {
        console.warn("Postgres update category failed, falling back to memory:", err);
      }
    }

    // Update in-memory store
    const store = this.getMemoryStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx !== -1) {
      store[idx] = updatedRecord;
      if (targetParentId !== current.parentId || targetSlug !== current.slug) {
        this.cascadeMemoryHierarchyUpdates(id, path, level);
      }
    }

    // Audit log
    await recordAuditLog({
      userId: userId || null,
      action: "categories.update",
      entityType: "category",
      entityId: id,
      changes: { before: current, after: updatedRecord },
    });

    return updatedRecord;
  }

  /**
   * Fast toggle for active/inactive status.
   */
  async toggleActive(id: string, isActive: boolean, userId?: string): Promise<Category> {
    return this.updateCategory(id, { id, isActive }, userId);
  }

  /**
   * Safe Archiving with Integrity Checks:
   * Rejects deletion if products or child subcategories are attached.
   */
  async archiveCategory(id: string, userId?: string): Promise<{ success: boolean; message: string }> {
    const category = await this.getCategoryById(id);
    if (!category) {
      throw new Error(`Category with ID "${id}" not found.`);
    }

    // Safety Check 1: Assigned products
    const productCounts = await this.getProductCountsMap();
    const counts = productCounts.get(id) || { total: 0, active: 0 };
    if (counts.total > 0) {
      throw new Error(
        `Cannot archive category "${category.name}": ${counts.total} product(s) are currently assigned to it. Please reassign or delete the products first.`
      );
    }

    // Safety Check 2: Active child subcategories
    const allCategories = await this.listCategories({ includeArchived: false });
    const children = allCategories.filter((c) => c.parentId === id);
    if (children.length > 0) {
      throw new Error(
        `Cannot archive category "${category.name}": it has ${children.length} active subcategory(ies) (${children.map((c) => c.name).join(", ")}). Please reassign or archive subcategories first.`
      );
    }

    const now = new Date();
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(categories)
          .set({
            deletedAt: now,
            isActive: false,
            updatedAt: now,
          })
          .where(eq(categories.id, id));
      } catch (err) {
        console.warn("Postgres archive category failed, falling back to memory:", err);
      }
    }

    // In-memory store
    const store = this.getMemoryStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx !== -1) {
      store[idx].deletedAt = now.toISOString();
      store[idx].isActive = false;
      store[idx].updatedAt = now.toISOString();
    }

    await recordAuditLog({
      userId: userId || null,
      action: "categories.delete",
      entityType: "category",
      entityId: id,
      changes: { after: { action: "archive", categoryName: category.name } },
    });

    return {
      success: true,
      message: `Category "${category.name}" has been successfully archived.`,
    };
  }

  /**
   * Restore an archived category back to active.
   */
  async restoreCategory(id: string, userId?: string): Promise<Category> {
    const category = await this.getCategoryById(id);
    if (!category) {
      throw new Error(`Category with ID "${id}" not found.`);
    }

    const now = new Date();
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(categories)
          .set({
            deletedAt: null,
            isActive: true,
            updatedAt: now,
          })
          .where(eq(categories.id, id));
      } catch (err) {
        console.warn("Postgres restore category failed, falling back to memory:", err);
      }
    }

    const store = this.getMemoryStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx !== -1) {
      store[idx].deletedAt = null;
      store[idx].isActive = true;
      store[idx].updatedAt = now.toISOString();
    }

    await recordAuditLog({
      userId: userId || null,
      action: "categories.update",
      entityType: "category",
      entityId: id,
      changes: { after: { action: "restore", categoryName: category.name } },
    });

    return (await this.getCategoryById(id))!;
  }

  /**
   * Returns all descendant IDs under a category node (recursive).
   */
  async getCategoryDescendantIds(categoryId: string): Promise<string[]> {
    const all = await this.listCategories({ includeInactive: true, includeArchived: true });
    const descendants: string[] = [];

    const collect = (parentId: string) => {
      for (const item of all) {
        if (item.parentId === parentId) {
          descendants.push(item.id);
          collect(item.id);
        }
      }
    };

    collect(categoryId);
    return descendants;
  }

  /**
   * Cascades path and level recalculations down the category tree in PostgreSQL.
   */
  private async cascadeHierarchyUpdates(parentId: string, parentPath: string, parentLevel: number) {
    const db = getDb();
    const children = await db
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(and(eq(categories.parentId, parentId), isNull(categories.deletedAt)));

    for (const child of children) {
      const childLevel = parentLevel + 1;
      const childPath = `${parentPath}/${child.slug}`;
      await db
        .update(categories)
        .set({ level: childLevel, path: childPath, updatedAt: new Date() })
        .where(eq(categories.id, child.id));

      await this.cascadeHierarchyUpdates(child.id, childPath, childLevel);
    }
  }

  /**
   * Cascades path and level recalculations down the category tree in memory.
   */
  private cascadeMemoryHierarchyUpdates(parentId: string, parentPath: string, parentLevel: number) {
    const store = this.getMemoryStore();
    for (const cat of store) {
      if (cat.parentId === parentId && !cat.deletedAt) {
        cat.level = parentLevel + 1;
        cat.path = `${parentPath}/${cat.slug}`;
        cat.updatedAt = new Date().toISOString();
        this.cascadeMemoryHierarchyUpdates(cat.id, cat.path, cat.level);
      }
    }
  }

  /**
   * Efficiently aggregates product counts per category.
   */
  private async getProductCountsMap(): Promise<Map<string, { total: number; active: number }>> {
    const map = new Map<string, { total: number; active: number }>();

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        // Count from primaryCategoryId
        const primaryRows = await db
          .select({
            categoryId: products.primaryCategoryId,
            status: products.status,
            count: sql<number>`count(*)::int`,
          })
          .from(products)
          .where(and(isNotNull(products.primaryCategoryId), isNull(products.deletedAt)))
          .groupBy(products.primaryCategoryId, products.status);

        for (const row of primaryRows) {
          if (!row.categoryId) continue;
          const curr = map.get(row.categoryId) || { total: 0, active: 0 };
          curr.total += Number(row.count);
          if (row.status === "active") {
            curr.active += Number(row.count);
          }
          map.set(row.categoryId, curr);
        }

        // Count secondary categories from productCategories junction
        const secondaryRows = await db
          .select({
            categoryId: productCategories.categoryId,
            count: sql<number>`count(*)::int`,
          })
          .from(productCategories)
          .groupBy(productCategories.categoryId);

        for (const row of secondaryRows) {
          if (!row.categoryId) continue;
          const curr = map.get(row.categoryId) || { total: 0, active: 0 };
          curr.total += Number(row.count);
          map.set(row.categoryId, curr);
        }

        return map;
      } catch (err) {
        console.warn("Postgres product counts aggregation failed, counting from memory products:", err);
      }
    }

    // Memory product count calculation
    try {
      // Import lazily to avoid circular module dependencies
      const { productService } = await import("@/lib/products/product-service");
      const { data: allProducts } = await productService.getProducts({
        page: 1,
        limit: 100,
        sort: "newest",
        status: "all",
      });

      for (const p of allProducts) {
        if (p.primaryCategoryId) {
          const curr = map.get(p.primaryCategoryId) || { total: 0, active: 0 };
          curr.total += 1;
          if (p.status === "active") curr.active += 1;
          map.set(p.primaryCategoryId, curr);
        }
      }
    } catch {
      // ignore
    }

    return map;
  }
}

export const categoryService = new CategoryService();
