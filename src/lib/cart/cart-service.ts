import { eq, and, sql, desc, asc, isNull, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import {
  carts as cartsTable,
  cartItems as cartItemsTable,
  products as productsTable,
  productVariants as variantsTable,
  productMedia as mediaTable,
  inventoryLevels as inventoryLevelsTable,
} from "@/lib/db/schema";
import { productService } from "@/lib/products/product-service";
import { variantService } from "@/lib/products/variant-service";
import { Product, ProductVariant } from "@/types";

// =============================================================================
// CART TYPES
// =============================================================================

export interface CartItemDetail {
  id: string;
  cartId: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  brand: string;
  variantId?: string | null;
  variantSku?: string | null;
  variantTitle?: string | null;
  variantAttributes: Record<string, string>;
  imageUrl?: string | null;
  unitPrice: number;
  compareAtPrice?: number | null;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  isAvailable: boolean;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
}

export interface CartSummary {
  id: string;
  userId?: string | null;
  guestSessionToken?: string | null;
  items: CartItemDetail[];
  itemCount: number; // total units
  lineCount: number; // distinct lines
  subtotal: number; // in USD decimal (e.g. 295.00)
  currency: string;
  freeShippingThreshold: number; // $150
  freeShippingQualified: boolean;
  amountUntilFreeShipping: number;
  hasUnavailableItems: boolean;
}

export interface MemoryCartRecord {
  id: string;
  userId?: string | null;
  guestSessionToken?: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryCartItemRecord {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  priceSnapshot: number;
  createdAt: string;
  updatedAt: string;
}

// Global in-memory fallback stores for non-DB environments
declare global {
  // eslint-disable-next-line no-var
  var _memoryCarts: Map<string, MemoryCartRecord> | undefined;
  // eslint-disable-next-line no-var
  var _memoryCartItems: Map<string, MemoryCartItemRecord> | undefined;
}

const memoryCarts: Map<string, MemoryCartRecord> =
  global._memoryCarts || (global._memoryCarts = new Map());

const memoryCartItems: Map<string, MemoryCartItemRecord> =
  global._memoryCartItems || (global._memoryCartItems = new Map());

// Safe financial calculation helpers (cents-based arithmetic to prevent IEEE-754 float drift)
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

// Free shipping threshold
const FREE_SHIPPING_THRESHOLD = 150;

export const cartService = {
  /**
   * Resolves or creates a cart record for either an authenticated user or a guest session.
   * Enforces IDOR security: carts can only be accessed with verified userId or verified guest token.
   */
  async getOrCreateCart(identity?: {
    userId?: string | null;
    guestSessionToken?: string | null;
  }): Promise<{ id: string; userId?: string | null; guestSessionToken?: string | null }> {
    let userId = identity?.userId ?? null;
    let guestSessionToken = identity?.guestSessionToken ?? null;

    if (!userId && !guestSessionToken) {
      guestSessionToken = crypto.randomUUID();
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();

        if (userId) {
          const userCarts = await db
            .select()
            .from(cartsTable)
            .where(eq(cartsTable.userId, userId))
            .orderBy(desc(cartsTable.updatedAt))
            .limit(1);

          if (userCarts.length > 0) {
            return {
              id: userCarts[0].id,
              userId: userCarts[0].userId,
              guestSessionToken: userCarts[0].guestSessionToken,
            };
          }

          // Create new authenticated cart
          const inserted = await db
            .insert(cartsTable)
            .values({
              userId,
              currency: "USD",
            })
            .returning();

          return {
            id: inserted[0].id,
            userId: inserted[0].userId,
            guestSessionToken: inserted[0].guestSessionToken,
          };
        }

        if (guestSessionToken) {
          const guestCarts = await db
            .select()
            .from(cartsTable)
            .where(eq(cartsTable.guestSessionToken, guestSessionToken))
            .limit(1);

          if (guestCarts.length > 0) {
            return {
              id: guestCarts[0].id,
              userId: guestCarts[0].userId,
              guestSessionToken: guestCarts[0].guestSessionToken,
            };
          }

          // Create new guest cart
          const inserted = await db
            .insert(cartsTable)
            .values({
              guestSessionToken,
              currency: "USD",
            })
            .returning();

          return {
            id: inserted[0].id,
            userId: inserted[0].userId,
            guestSessionToken: inserted[0].guestSessionToken,
          };
        }
      } catch (err) {
        console.warn("DB getOrCreateCart failed, using memory fallback:", err);
      }
    }

    // In-memory fallback
    if (userId) {
      for (const cart of memoryCarts.values()) {
        if (cart.userId === userId) {
          return { id: cart.id, userId: cart.userId, guestSessionToken: cart.guestSessionToken };
        }
      }

      const newId = `cart-user-${userId}`;
      const newCart: MemoryCartRecord = {
        id: newId,
        userId,
        currency: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryCarts.set(newId, newCart);
      return { id: newId, userId, guestSessionToken: null };
    }

    if (guestSessionToken) {
      for (const cart of memoryCarts.values()) {
        if (cart.guestSessionToken === guestSessionToken) {
          return { id: cart.id, userId: cart.userId, guestSessionToken: cart.guestSessionToken };
        }
      }

      const newId = `cart-guest-${guestSessionToken.substring(0, 8)}`;
      const newCart: MemoryCartRecord = {
        id: newId,
        guestSessionToken,
        currency: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryCarts.set(newId, newCart);
      return { id: newId, userId: null, guestSessionToken };
    }

    throw new Error("Failed to create or retrieve cart");
  },

  /**
   * Retrieves cart summary with all line items.
   * Performs authoritative server-side price revalidation and stock verification.
   */
  async getCart(identity?: {
    userId?: string | null;
    guestSessionToken?: string | null;
  }): Promise<CartSummary> {
    const userId = identity?.userId ?? null;
    const guestSessionToken = identity?.guestSessionToken ?? null;

    if (!userId && !guestSessionToken) {
      return {
        id: "empty-cart",
        userId: null,
        guestSessionToken: null,
        items: [],
        itemCount: 0,
        lineCount: 0,
        subtotal: 0,
        currency: "USD",
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        freeShippingQualified: false,
        amountUntilFreeShipping: FREE_SHIPPING_THRESHOLD,
        hasUnavailableItems: false,
      };
    }

    const cartRecord = await this.getOrCreateCart({ userId, guestSessionToken });
    const cartId = cartRecord.id;

    let rawItems: {
      id: string;
      cartId: string;
      productId: string;
      variantId?: string | null;
      quantity: number;
      priceSnapshot: number;
    }[] = [];

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select({
            id: cartItemsTable.id,
            cartId: cartItemsTable.cartId,
            variantId: cartItemsTable.variantId,
            quantity: cartItemsTable.quantity,
            priceSnapshot: cartItemsTable.priceSnapshot,
            productId: variantsTable.productId,
          })
          .from(cartItemsTable)
          .leftJoin(variantsTable, eq(cartItemsTable.variantId, variantsTable.id))
          .where(eq(cartItemsTable.cartId, cartId))
          .orderBy(asc(cartItemsTable.createdAt));

        rawItems = rows.map((r) => ({
          id: r.id,
          cartId: r.cartId,
          productId: r.productId || "",
          variantId: r.variantId,
          quantity: r.quantity,
          priceSnapshot: parseFloat(r.priceSnapshot),
        }));
      } catch (err) {
        console.warn("DB getCart items failed, using memory fallback:", err);
      }
    }

    if (rawItems.length === 0 && (!isDatabaseConfigured() || memoryCartItems.size > 0)) {
      rawItems = Array.from(memoryCartItems.values())
        .filter((item) => item.cartId === cartId)
        .map((item) => ({
          id: item.id,
          cartId: item.cartId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
        }));
    }

    // Server-side authoritative validation and line detail resolution
    const detailedItems: CartItemDetail[] = [];
    let totalCents = 0;
    let totalUnits = 0;
    let hasUnavailable = false;

    for (const rawItem of rawItems) {
      const product = await productService.getProductById(rawItem.productId);

      // Product must exist and be active
      if (!product || product.status !== "active" || product.deletedAt) {
        // Auto-purge unavailable product
        await this.internalRemoveItem(rawItem.id);
        hasUnavailable = true;
        continue;
      }

      let variant: ProductVariant | null = null;
      let effectivePrice = product.basePrice;
      let compareAtPrice = product.compareAtPrice ?? null;
      let availableStock = product.stockCount ?? 10;
      let variantSku = product.modelCode ?? undefined;
      let variantTitle: string | undefined = undefined;
      let variantAttributes: Record<string, string> = {};
      let imageUrl: string | null =
        product.media?.find((m) => m.isPrimary)?.url || product.media?.[0]?.url || null;

      if (rawItem.variantId) {
        const variants = await variantService.listVariantsByProductId(product.id, {
          includeArchived: false,
        });
        const matched = variants.find((v) => v.id === rawItem.variantId);

        if (!matched || !matched.isActive || matched.deletedAt) {
          // Variant no longer active/available
          await this.internalRemoveItem(rawItem.id);
          hasUnavailable = true;
          continue;
        }

        variant = matched;
        effectivePrice = variant.priceOverride ?? product.basePrice;
        compareAtPrice = variant.compareAtPrice ?? product.compareAtPrice ?? null;
        variantSku = variant.sku;
        variantTitle = variant.title;
        const mappedAttrs: Record<string, string> = {};
        if (variant.attributes) {
          for (const [k, v] of Object.entries(variant.attributes)) {
            if (v !== undefined && v !== null) {
              mappedAttrs[k] = String(v);
            }
          }
        }
        variantAttributes = mappedAttrs;

        if (variant.images && variant.images.length > 0) {
          imageUrl = variant.images[0];
        }

        availableStock =
          variant.availableQuantity !== undefined
            ? variant.availableQuantity
            : variant.stockQuantity !== undefined
            ? variant.stockQuantity
            : 10;
      }

      // Quantity safety clamp: cannot exceed available stock if stock > 0
      let quantity = rawItem.quantity;
      const isAvailable = availableStock > 0;

      if (isAvailable && quantity > availableStock) {
        quantity = Math.max(1, availableStock);
        // Persist adjusted quantity
        await this.internalUpdateQuantity(rawItem.id, quantity);
      }

      // Live price revalidation: if price snapshot differs from authoritative server price, update it
      if (Math.abs(rawItem.priceSnapshot - effectivePrice) > 0.001) {
        await this.internalUpdatePrice(rawItem.id, effectivePrice);
      }

      const itemLineCents = toCents(effectivePrice) * quantity;
      totalCents += itemLineCents;
      totalUnits += quantity;

      const stockStatus: "in_stock" | "low_stock" | "out_of_stock" =
        availableStock <= 0
          ? "out_of_stock"
          : availableStock <= 5
          ? "low_stock"
          : "in_stock";

      if (stockStatus === "out_of_stock") {
        hasUnavailable = true;
      }

      detailedItems.push({
        id: rawItem.id,
        cartId,
        productId: product.id,
        productSlug: product.slug,
        productTitle: product.title,
        brand: product.brand,
        variantId: variant ? variant.id : null,
        variantSku: variantSku ?? null,
        variantTitle: variantTitle ?? null,
        variantAttributes,
        imageUrl,
        unitPrice: effectivePrice,
        compareAtPrice,
        quantity,
        lineTotal: fromCents(itemLineCents),
        availableStock,
        isAvailable,
        stockStatus,
      });
    }

    const subtotal = fromCents(totalCents);
    const freeShippingQualified = subtotal >= FREE_SHIPPING_THRESHOLD;
    const amountUntilFreeShipping = freeShippingQualified
      ? 0
      : fromCents(toCents(FREE_SHIPPING_THRESHOLD) - totalCents);

    return {
      id: cartId,
      userId: cartRecord.userId,
      guestSessionToken: cartRecord.guestSessionToken,
      items: detailedItems,
      itemCount: totalUnits,
      lineCount: detailedItems.length,
      subtotal,
      currency: "USD",
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      freeShippingQualified,
      amountUntilFreeShipping,
      hasUnavailableItems: hasUnavailable,
    };
  },

  /**
   * Adds an item to the customer or guest cart.
   * If the identical product/variant already exists, merges quantity.
   * Checks inventory and validates prices authoritatively server-side.
   */
  async addItem(
    identity: { userId?: string | null; guestSessionToken?: string | null },
    input: {
      productId: string;
      variantId?: string | null;
      quantity: number;
    }
  ): Promise<CartSummary> {
    const { productId, variantId, quantity } = input;

    if (!quantity || quantity < 1) {
      throw new Error("Quantity must be at least 1.");
    }
    if (quantity > 10) {
      throw new Error("Maximum 10 units per line item allowed for retail purchases.");
    }

    // 1. Validate product exists and is active
    const product = await productService.getProductById(productId);
    if (!product || product.status !== "active" || product.deletedAt) {
      throw new Error("The requested product is unavailable or no longer in catalog.");
    }

    // 2. Validate variant if product has variants
    let effectivePrice = product.basePrice;
    let availableStock = product.stockCount ?? 10;

    if (product.hasVariants) {
      if (!variantId) {
        throw new Error("Please select your preferred options before adding to bag.");
      }

      const variants = await variantService.listVariantsByProductId(product.id, {
        includeArchived: false,
      });
      const variant = variants.find((v) => v.id === variantId);

      if (!variant || !variant.isActive || variant.deletedAt) {
        throw new Error("The selected variant combination is no longer available.");
      }

      effectivePrice = variant.priceOverride ?? product.basePrice;
      availableStock =
        variant.availableQuantity !== undefined
          ? variant.availableQuantity
          : variant.stockQuantity !== undefined
          ? variant.stockQuantity
          : 10;
    } else if (variantId) {
      // Optional variant binding
      const variants = await variantService.listVariantsByProductId(product.id);
      const variant = variants.find((v) => v.id === variantId);
      if (variant) {
        effectivePrice = variant.priceOverride ?? product.basePrice;
        availableStock =
          variant.availableQuantity !== undefined
            ? variant.availableQuantity
            : variant.stockQuantity !== undefined
            ? variant.stockQuantity
            : 10;
      }
    }

    if (availableStock <= 0) {
      throw new Error("This item is currently out of stock.");
    }

    // 3. Resolve cart
    const cartRecord = await this.getOrCreateCart(identity);
    const cartId = cartRecord.id;

    // 4. Check if duplicate row exists in cart
    let existingItem: { id: string; quantity: number } | null = null;

    let resolvedVariantId = variantId;
    if (!resolvedVariantId) {
      const variants = await variantService.listVariantsByProductId(product.id);
      if (variants.length > 0) {
        resolvedVariantId = variants[0].id;
      }
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const conditions = [eq(cartItemsTable.cartId, cartId)];
        if (resolvedVariantId) {
          conditions.push(eq(cartItemsTable.variantId, resolvedVariantId));
        }

        const existing = await db
          .select()
          .from(cartItemsTable)
          .where(and(...conditions))
          .limit(1);

        if (existing.length > 0) {
          existingItem = { id: existing[0].id, quantity: existing[0].quantity };
        }
      } catch (err) {
        console.warn("DB check existing cart item failed, using memory:", err);
      }
    }

    if (!existingItem) {
      for (const item of memoryCartItems.values()) {
        if (
          item.cartId === cartId &&
          item.productId === productId &&
          (variantId ? item.variantId === variantId : !item.variantId)
        ) {
          existingItem = { id: item.id, quantity: item.quantity };
          break;
        }
      }
    }

    if (existingItem) {
      // Increment existing line quantity
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > availableStock) {
        throw new Error(
          `Cannot add ${quantity} more. You already have ${existingItem.quantity} in bag, and only ${availableStock} are available.`
        );
      }
      if (newQuantity > 10) {
        throw new Error("You cannot add more than 10 units of this item to your bag.");
      }

      await this.internalUpdateQuantity(existingItem.id, newQuantity);
      await this.internalUpdatePrice(existingItem.id, effectivePrice);
    } else {
      // Insert new line item
      if (quantity > availableStock) {
        throw new Error(`Only ${availableStock} units available in stock.`);
      }

      const itemId = `ci-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      if (isDatabaseConfigured() && resolvedVariantId) {
        try {
          const db = getDb();
          await db.insert(cartItemsTable).values({
            cartId,
            variantId: resolvedVariantId,
            quantity,
            priceSnapshot: effectivePrice.toFixed(2),
          });
        } catch (err) {
          console.warn("DB insert cart item failed, using memory:", err);
          memoryCartItems.set(itemId, {
            id: itemId,
            cartId,
            productId,
            variantId: variantId || null,
            quantity,
            priceSnapshot: effectivePrice,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        memoryCartItems.set(itemId, {
          id: itemId,
          cartId,
          productId,
          variantId: variantId || null,
          quantity,
          priceSnapshot: effectivePrice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return this.getCart(identity);
  },

  /**
   * Updates the quantity of an existing cart line item.
   * Enforces IDOR protection by ensuring the item belongs to the caller's cart.
   */
  async updateItemQuantity(
    identity: { userId?: string | null; guestSessionToken?: string | null },
    itemId: string,
    quantity: number
  ): Promise<CartSummary> {
    const cart = await this.getCart(identity);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new Error("Item not found in your shopping bag.");
    }

    if (quantity <= 0) {
      return this.removeItem(identity, itemId);
    }

    if (quantity > 10) {
      throw new Error("Maximum 10 units per line item allowed for retail purchases.");
    }

    if (quantity > item.availableStock) {
      throw new Error(
        `Only ${item.availableStock} units available in stock. Quantity adjusted to maximum available.`
      );
    }

    await this.internalUpdateQuantity(itemId, quantity);
    return this.getCart(identity);
  },

  /**
   * Removes a line item from the shopping bag.
   * Enforces IDOR protection by verifying item ownership.
   */
  async removeItem(
    identity: { userId?: string | null; guestSessionToken?: string | null },
    itemId: string
  ): Promise<CartSummary> {
    const cart = await this.getCart(identity);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new Error("Item not found in your shopping bag.");
    }

    await this.internalRemoveItem(itemId);
    return this.getCart(identity);
  },

  /**
   * Clears all items in the caller's cart.
   */
  async clearCart(identity: {
    userId?: string | null;
    guestSessionToken?: string | null;
  }): Promise<CartSummary> {
    const cart = await this.getCart(identity);

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
      } catch (err) {
        console.warn("DB clearCart failed, using memory:", err);
      }
    }

    for (const [id, item] of memoryCartItems.entries()) {
      if (item.cartId === cart.id) {
        memoryCartItems.delete(id);
      }
    }

    return this.getCart(identity);
  },

  /**
   * Merges a guest cart into an authenticated customer's cart upon sign-in.
   * Combines duplicate lines, revalidates stock and live prices.
   */
  async mergeGuestCart(userId: string, guestSessionToken: string): Promise<CartSummary> {
    if (!guestSessionToken || !userId) {
      return this.getCart({ userId });
    }

    const guestCart = await this.getCart({ guestSessionToken });

    if (guestCart.items.length === 0) {
      return this.getCart({ userId });
    }

    // Add each guest item into customer cart
    for (const guestItem of guestCart.items) {
      try {
        await this.addItem(
          { userId },
          {
            productId: guestItem.productId,
            variantId: guestItem.variantId,
            quantity: guestItem.quantity,
          }
        );
      } catch (err) {
        console.warn("Failed to merge guest cart item:", guestItem.id, err);
      }
    }

    // Clear guest cart
    await this.clearCart({ guestSessionToken });

    return this.getCart({ userId });
  },

  // Internal mutation helpers
  async internalUpdateQuantity(itemId: string, quantity: number): Promise<void> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(cartItemsTable)
          .set({ quantity, updatedAt: new Date() })
          .where(eq(cartItemsTable.id, itemId));
        return;
      } catch (err) {
        console.warn("DB updateQuantity failed, using memory:", err);
      }
    }

    const memItem = memoryCartItems.get(itemId);
    if (memItem) {
      memItem.quantity = quantity;
      memItem.updatedAt = new Date().toISOString();
    }
  },

  async internalUpdatePrice(itemId: string, price: number): Promise<void> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(cartItemsTable)
          .set({ priceSnapshot: price.toFixed(2), updatedAt: new Date() })
          .where(eq(cartItemsTable.id, itemId));
        return;
      } catch (err) {
        console.warn("DB updatePrice failed, using memory:", err);
      }
    }

    const memItem = memoryCartItems.get(itemId);
    if (memItem) {
      memItem.priceSnapshot = price;
      memItem.updatedAt = new Date().toISOString();
    }
  },

  async internalRemoveItem(itemId: string): Promise<void> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));
        return;
      } catch (err) {
        console.warn("DB removeItem failed, using memory:", err);
      }
    }

    memoryCartItems.delete(itemId);
  },
};
