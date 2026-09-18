"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { wishlistService, WishlistItemDetail } from "@/lib/wishlist/wishlist-service";

export interface WishlistActionResponse {
  success: boolean;
  isWishlisted?: boolean;
  count?: number;
  error?: string;
  requiresAuth?: boolean;
  items?: WishlistItemDetail[];
}

/**
 * Toggles a product in the authenticated customer's wishlist.
 * Strictly checks server session to prevent IDOR / spoofing.
 */
export async function toggleWishlistAction(
  productId: string,
  variantId?: string | null
): Promise<WishlistActionResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return {
        success: false,
        requiresAuth: true,
        error: "Sign in to curate your private wishlist and track atelier releases.",
      };
    }

    if (!productId || typeof productId !== "string") {
      return {
        success: false,
        error: "Valid product identifier is required.",
      };
    }

    const result = await wishlistService.toggleWishlist(user.id, productId, variantId);
    revalidatePath("/account/wishlist");
    revalidatePath("/shop");
    revalidatePath("/category");
    revalidatePath("/collections");

    return {
      success: true,
      isWishlisted: result.isWishlisted,
      count: result.count,
    };
  } catch (err) {
    console.error("toggleWishlistAction error:", err);
    return {
      success: false,
      error: "Unable to update wishlist at this time.",
    };
  }
}

/**
 * Removes an item from the customer's wishlist.
 */
export async function removeFromWishlistAction(
  productId: string
): Promise<WishlistActionResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return {
        success: false,
        requiresAuth: true,
        error: "Session expired. Please sign in again.",
      };
    }

    const result = await wishlistService.removeFromWishlist(user.id, productId);
    const count = await wishlistService.getWishlistCount(user.id);
    revalidatePath("/account/wishlist");

    return {
      success: true,
      isWishlisted: false,
      count,
    };
  } catch (err) {
    console.error("removeFromWishlistAction error:", err);
    return {
      success: false,
      error: "Failed to remove item from wishlist.",
    };
  }
}

/**
 * Moves an item from customer's wishlist directly into their shopping cart.
 */
export async function moveWishlistToCartAction(
  productId: string,
  variantId?: string | null
): Promise<WishlistActionResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return {
        success: false,
        requiresAuth: true,
        error: "Sign in to move items to your shopping bag.",
      };
    }

    await wishlistService.moveWishlistItemToCart(user.id, productId, variantId);
    const count = await wishlistService.getWishlistCount(user.id);

    revalidatePath("/account/wishlist");
    revalidatePath("/cart");

    return {
      success: true,
      isWishlisted: false,
      count,
    };
  } catch (err) {
    console.error("moveWishlistToCartAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to move item to cart.",
    };
  }
}

/**
 * Fetches all product IDs currently in the user's wishlist for instant active state in cards.
 */
export async function getWishlistProductIdsAction(): Promise<string[]> {
  try {
    const user = await getSessionUser();
    if (!user) return [];
    return await wishlistService.getWishlistProductIds(user.id);
  } catch {
    return [];
  }
}

/**
 * Fetches full wishlist items for the authenticated user.
 */
export async function getUserWishlistAction(): Promise<WishlistItemDetail[]> {
  try {
    const user = await getSessionUser();
    if (!user) return [];
    return await wishlistService.getUserWishlist(user.id);
  } catch {
    return [];
  }
}
