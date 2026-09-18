/**
 * Guest-to-Customer Cart Merge Engine.
 * Securely transitions guest cart items to the authenticated customer account upon login,
 * properly handling duplicate items, quantity consolidation, and inventory limits.
 */

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  price: number;
  addedAt: string;
}

export interface MergedCartResult {
  userId: string;
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  transferredCount: number;
}

// In-memory cart store for guest and customer sessions
declare global {
  // eslint-disable-next-line no-var
  var _guestCartsStore: Map<string, CartItem[]> | undefined;
  // eslint-disable-next-line no-var
  var _userCartsStore: Map<string, CartItem[]> | undefined;
}

const guestCarts: Map<string, CartItem[]> =
  global._guestCartsStore || (global._guestCartsStore = new Map());

const userCarts: Map<string, CartItem[]> =
  global._userCartsStore || (global._userCartsStore = new Map());

/**
 * Merges a guest cart into a user's persistent cart upon authentication.
 * Consolidation Rules:
 * 1. If an item variant already exists in customer's cart, sums the quantities (clamping to max 10 per variant).
 * 2. If an item variant does not exist in customer's cart, appends the item to the customer's cart.
 * 3. Safely clears the guest cart after consolidation to prevent double-claiming.
 */
export async function mergeGuestCartToCustomer(
  guestSessionId: string,
  userId: string,
  maxAllowedPerItem: number = 10
): Promise<MergedCartResult> {
  const guestItems = guestCarts.get(guestSessionId) || [];
  const existingCustomerItems = userCarts.get(userId) || [];

  if (guestItems.length === 0) {
    const totalQuantity = existingCustomerItems.reduce((acc, it) => acc + it.quantity, 0);
    const subtotal = existingCustomerItems.reduce((acc, it) => acc + it.quantity * it.price, 0);
    return {
      userId,
      items: existingCustomerItems,
      itemCount: existingCustomerItems.length,
      totalQuantity,
      subtotal,
      transferredCount: 0,
    };
  }

  // Create a map by variantId for consolidation
  const consolidatedMap = new Map<string, CartItem>();

  // Seed with existing user items
  for (const item of existingCustomerItems) {
    consolidatedMap.set(item.variantId, { ...item });
  }

  let transferredCount = 0;

  // Merge guest items
  for (const guestItem of guestItems) {
    if (consolidatedMap.has(guestItem.variantId)) {
      const current = consolidatedMap.get(guestItem.variantId)!;
      // Consolidate quantity up to allowed limit
      const newQty = Math.min(current.quantity + guestItem.quantity, maxAllowedPerItem);
      current.quantity = newQty;
      transferredCount++;
    } else {
      consolidatedMap.set(guestItem.variantId, {
        ...guestItem,
        id: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      });
      transferredCount++;
    }
  }

  const mergedItems = Array.from(consolidatedMap.values());
  userCarts.set(userId, mergedItems);

  // Clear guest cart once merged
  guestCarts.delete(guestSessionId);

  const totalQuantity = mergedItems.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = mergedItems.reduce((acc, it) => acc + it.quantity * it.price, 0);

  return {
    userId,
    items: mergedItems,
    itemCount: mergedItems.length,
    totalQuantity,
    subtotal,
    transferredCount,
  };
}

/**
 * Sets guest cart items (used for testing or storefront guest cart manipulation).
 */
export function setGuestCartItems(guestSessionId: string, items: CartItem[]): void {
  guestCarts.set(guestSessionId, items);
}

/**
 * Gets customer cart items.
 */
export function getCustomerCartItems(userId: string): CartItem[] {
  return userCarts.get(userId) || [];
}
