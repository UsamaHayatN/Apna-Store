import { eq, and, desc, inArray } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import {
  wishlists as wishlistsTable,
  wishlistItems as wishlistItemsTable,
  products as productsTable,
  productMedia as mediaTable,
  productCategories as productCategoriesTable,
  categories as categoriesTable,
  productVariants as variantsTable,
} from "@/lib/db/schema";
import { productService } from "@/lib/products/product-service";
import { cartService } from "@/lib/cart/cart-service";

export interface WishlistItemDetail {
  id: string;
  wishlistId: string;
  productId: string;
  variantId?: string | null;
  productTitle: string;
  productSlug: string;
  brand: string;
  basePrice: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  isAvailable: boolean;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  categoryName?: string | null;
  addedAt: string;
}

export interface MemoryWishlistRecord {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryWishlistItemRecord {
  id: string;
  wishlistId: string;
  productId: string;
  variantId?: string | null;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var _memoryWishlists: Map<string, MemoryWishlistRecord> | undefined;
  // eslint-disable-next-line no-var
  var _memoryWishlistItems: Map<string, MemoryWishlistItemRecord> | undefined;
}

const memoryWishlists: Map<string, MemoryWishlistRecord> =
  global._memoryWishlists || (global._memoryWishlists = new Map());

const memoryWishlistItems: Map<string, MemoryWishlistItemRecord> =
  global._memoryWishlistItems || (global._memoryWishlistItems = new Map());

export const wishlistService = {
  /**
   * Resolves or creates a user's primary wishlist.
   */
  async getOrCreateUserWishlist(userId: string): Promise<string> {
    if (!userId) {
      throw new Error("Cannot access wishlist without an authenticated user ID.");
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const existing = await db
          .select({ id: wishlistsTable.id })
          .from(wishlistsTable)
          .where(eq(wishlistsTable.userId, userId))
          .limit(1);

        if (existing.length > 0 && existing[0]) {
          return existing[0].id;
        }

        const inserted = await db
          .insert(wishlistsTable)
          .values({
            userId,
            name: "My Curated Wishlist",
            isPublic: false,
          })
          .returning({ id: wishlistsTable.id });

        if (inserted.length > 0 && inserted[0]) {
          return inserted[0].id;
        }
      } catch (err) {
        console.warn("Database wishlist resolution fallback to memory:", err);
      }
    }

    // Memory fallback
    for (const w of memoryWishlists.values()) {
      if (w.userId === userId) {
        return w.id;
      }
    }

    const newId = `wl-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    memoryWishlists.set(newId, {
      id: newId,
      userId,
      name: "My Curated Wishlist",
      createdAt: now,
      updatedAt: now,
    });
    return newId;
  },

  /**
   * Returns list of product IDs currently in the user's wishlist.
   */
  async getWishlistProductIds(userId: string): Promise<string[]> {
    if (!userId) return [];

    const wishlistId = await this.getOrCreateUserWishlist(userId);

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select({ productId: wishlistItemsTable.productId })
          .from(wishlistItemsTable)
          .where(eq(wishlistItemsTable.wishlistId, wishlistId));

        return rows.map((r) => r.productId);
      } catch (err) {
        console.warn("Database getWishlistProductIds fallback to memory:", err);
      }
    }

    const results: string[] = [];
    for (const item of memoryWishlistItems.values()) {
      if (item.wishlistId === wishlistId) {
        results.push(item.productId);
      }
    }
    return results;
  },

  /**
   * Returns full detailed wishlist items for the authenticated user.
   */
  async getUserWishlist(userId: string): Promise<WishlistItemDetail[]> {
    if (!userId) return [];

    const wishlistId = await this.getOrCreateUserWishlist(userId);

    // If using DB
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const items = await db
          .select({
            id: wishlistItemsTable.id,
            wishlistId: wishlistItemsTable.wishlistId,
            productId: wishlistItemsTable.productId,
            variantId: wishlistItemsTable.variantId,
            createdAt: wishlistItemsTable.createdAt,
            productTitle: productsTable.title,
            productSlug: productsTable.slug,
            brand: productsTable.brand,
            basePrice: productsTable.basePrice,
            compareAtPrice: productsTable.compareAtPrice,
            status: productsTable.status,
          })
          .from(wishlistItemsTable)
          .innerJoin(productsTable, eq(wishlistItemsTable.productId, productsTable.id))
          .where(eq(wishlistItemsTable.wishlistId, wishlistId))
          .orderBy(desc(wishlistItemsTable.createdAt));

        const detailedItems: WishlistItemDetail[] = [];

        for (const it of items) {
          // Fetch primary image
          const mediaRows = await db
            .select({ url: mediaTable.url })
            .from(mediaTable)
            .where(eq(mediaTable.productId, it.productId))
            .orderBy(desc(mediaTable.isPrimary))
            .limit(1);

          const imageUrl = mediaRows.length > 0 ? mediaRows[0]?.url : null;

          const isPublished = it.status === "active";

          detailedItems.push({
            id: it.id,
            wishlistId: it.wishlistId,
            productId: it.productId,
            variantId: it.variantId,
            productTitle: it.productTitle,
            productSlug: it.productSlug,
            brand: it.brand || "Atelier",
            basePrice: Number(it.basePrice),
            compareAtPrice: it.compareAtPrice ? Number(it.compareAtPrice) : null,
            imageUrl,
            isAvailable: isPublished,
            stockStatus: isPublished ? "in_stock" : "out_of_stock",
            categoryName: null,
            addedAt: it.createdAt.toISOString(),
          });
        }

        return detailedItems;
      } catch (err) {
        console.warn("Database getUserWishlist fallback to memory:", err);
      }
    }

    // Memory Fallback
    const results: WishlistItemDetail[] = [];
    const items = Array.from(memoryWishlistItems.values()).filter(
      (item) => item.wishlistId === wishlistId
    );

    for (const item of items) {
      const product = await productService.getProductById(item.productId);
      if (!product) continue;

      const isPublished = product.status === "active";

      results.push({
        id: item.id,
        wishlistId: item.wishlistId,
        productId: item.productId,
        variantId: item.variantId,
        productTitle: product.title,
        productSlug: product.slug,
        brand: product.brand || "Atelier",
        basePrice: Number(product.basePrice),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        imageUrl: product.media?.[0]?.url || null,
        isAvailable: isPublished,
        stockStatus: isPublished ? "in_stock" : "out_of_stock",
        categoryName: product.primaryCategory?.name || null,
        addedAt: item.createdAt,
      });
    }

    return results;
  },

  /**
   * Adds a product to the user's wishlist (prevents duplicates).
   */
  async addToWishlist(
    userId: string,
    productId: string,
    variantId?: string | null
  ): Promise<{ success: boolean; isWishlisted: boolean }> {
    if (!userId) {
      throw new Error("Authentication required to save to wishlist.");
    }

    const wishlistId = await this.getOrCreateUserWishlist(userId);

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        // Check if already in wishlist
        const existing = await db
          .select({ id: wishlistItemsTable.id })
          .from(wishlistItemsTable)
          .where(
            and(
              eq(wishlistItemsTable.wishlistId, wishlistId),
              eq(wishlistItemsTable.productId, productId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          return { success: true, isWishlisted: true };
        }

        await db.insert(wishlistItemsTable).values({
          wishlistId,
          productId,
          variantId: variantId || null,
        });

        return { success: true, isWishlisted: true };
      } catch (err) {
        console.warn("Database addToWishlist fallback to memory:", err);
      }
    }

    // Memory fallback
    for (const item of memoryWishlistItems.values()) {
      if (item.wishlistId === wishlistId && item.productId === productId) {
        return { success: true, isWishlisted: true };
      }
    }

    const id = `wli-${crypto.randomUUID()}`;
    memoryWishlistItems.set(id, {
      id,
      wishlistId,
      productId,
      variantId: variantId || null,
      createdAt: new Date().toISOString(),
    });

    return { success: true, isWishlisted: true };
  },

  /**
   * Removes a product from the user's wishlist.
   */
  async removeFromWishlist(
    userId: string,
    productId: string
  ): Promise<{ success: boolean; isWishlisted: boolean }> {
    if (!userId) {
      throw new Error("Authentication required to modify wishlist.");
    }

    const wishlistId = await this.getOrCreateUserWishlist(userId);

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .delete(wishlistItemsTable)
          .where(
            and(
              eq(wishlistItemsTable.wishlistId, wishlistId),
              eq(wishlistItemsTable.productId, productId)
            )
          );

        return { success: true, isWishlisted: false };
      } catch (err) {
        console.warn("Database removeFromWishlist fallback to memory:", err);
      }
    }

    // Memory fallback
    for (const [key, item] of memoryWishlistItems.entries()) {
      if (item.wishlistId === wishlistId && item.productId === productId) {
        memoryWishlistItems.delete(key);
      }
    }

    return { success: true, isWishlisted: false };
  },

  /**
   * Toggles product in user's wishlist (adds if absent, removes if present).
   */
  async toggleWishlist(
    userId: string,
    productId: string,
    variantId?: string | null
  ): Promise<{ success: boolean; isWishlisted: boolean; count: number }> {
    if (!userId) {
      throw new Error("Authentication required to manage wishlist.");
    }

    const wishlistId = await this.getOrCreateUserWishlist(userId);
    let isCurrentlyWishlisted = false;

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const existing = await db
          .select({ id: wishlistItemsTable.id })
          .from(wishlistItemsTable)
          .where(
            and(
              eq(wishlistItemsTable.wishlistId, wishlistId),
              eq(wishlistItemsTable.productId, productId)
            )
          )
          .limit(1);

        if (existing.length > 0 && existing[0]) {
          await db
            .delete(wishlistItemsTable)
            .where(eq(wishlistItemsTable.id, existing[0].id));
          isCurrentlyWishlisted = false;
        } else {
          await db.insert(wishlistItemsTable).values({
            wishlistId,
            productId,
            variantId: variantId || null,
          });
          isCurrentlyWishlisted = true;
        }

        const countRes = await db
          .select({ id: wishlistItemsTable.id })
          .from(wishlistItemsTable)
          .where(eq(wishlistItemsTable.wishlistId, wishlistId));

        return {
          success: true,
          isWishlisted: isCurrentlyWishlisted,
          count: countRes.length,
        };
      } catch (err) {
        console.warn("Database toggleWishlist fallback to memory:", err);
      }
    }

    // Memory fallback
    let existingKey: string | null = null;
    for (const [key, item] of memoryWishlistItems.entries()) {
      if (item.wishlistId === wishlistId && item.productId === productId) {
        existingKey = key;
        break;
      }
    }

    if (existingKey) {
      memoryWishlistItems.delete(existingKey);
      isCurrentlyWishlisted = false;
    } else {
      const id = `wli-${crypto.randomUUID()}`;
      memoryWishlistItems.set(id, {
        id,
        wishlistId,
        productId,
        variantId: variantId || null,
        createdAt: new Date().toISOString(),
      });
      isCurrentlyWishlisted = true;
    }

    const totalCount = Array.from(memoryWishlistItems.values()).filter(
      (i) => i.wishlistId === wishlistId
    ).length;

    return {
      success: true,
      isWishlisted: isCurrentlyWishlisted,
      count: totalCount,
    };
  },

  /**
   * Moves an item from wishlist into the cart.
   */
  async moveWishlistItemToCart(
    userId: string,
    productId: string,
    variantId?: string | null
  ) {
    if (!userId) {
      throw new Error("Authentication required.");
    }

    // Add to cart
    const cartSummary = await cartService.addItem(
      { userId },
      { productId, variantId: variantId || undefined, quantity: 1 }
    );

    // Remove from wishlist
    await this.removeFromWishlist(userId, productId);

    return {
      success: true,
      cartSummary,
    };
  },

  /**
   * Returns count of items in wishlist for user.
   */
  async getWishlistCount(userId: string): Promise<number> {
    if (!userId) return 0;
    const wishlistId = await this.getOrCreateUserWishlist(userId);

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select({ id: wishlistItemsTable.id })
          .from(wishlistItemsTable)
          .where(eq(wishlistItemsTable.wishlistId, wishlistId));
        return rows.length;
      } catch {
        // Fallback to memory
      }
    }

    return Array.from(memoryWishlistItems.values()).filter(
      (i) => i.wishlistId === wishlistId
    ).length;
  },
};
