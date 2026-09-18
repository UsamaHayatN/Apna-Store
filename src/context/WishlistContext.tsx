"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toggleWishlistAction, removeFromWishlistAction, getWishlistProductIdsAction } from "@/app/actions/wishlist";

interface WishlistContextType {
  wishlistIds: Set<string>;
  wishlistCount: number;
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (
    productId: string,
    variantId?: string | null
  ) => Promise<{ success: boolean; requiresAuth?: boolean; error?: string }>;
  removeFromWishlist: (productId: string) => Promise<{ success: boolean; error?: string }>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshWishlist = useCallback(async () => {
    try {
      const ids = await getWishlistProductIdsAction();
      setWishlistIds(new Set(ids));
    } catch (err) {
      console.warn("Could not refresh wishlist:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isWishlisted = useCallback(
    (productId: string) => {
      return wishlistIds.has(productId);
    },
    [wishlistIds]
  );

  const toggleWishlist = useCallback(
    async (productId: string, variantId?: string | null) => {
      // Optimistic update
      const wasWishlisted = wishlistIds.has(productId);
      const nextSet = new Set(wishlistIds);
      if (wasWishlisted) {
        nextSet.delete(productId);
      } else {
        nextSet.add(productId);
      }
      setWishlistIds(nextSet);

      try {
        const res = await toggleWishlistAction(productId, variantId);
        if (!res.success) {
          // Revert optimistic update
          setWishlistIds(wishlistIds);

          if (res.requiresAuth) {
            // Redirect guest to login with return path
            const currentUrl = pathname || "/";
            router.push(`/account?redirect=${encodeURIComponent(currentUrl)}`);
            return { success: false, requiresAuth: true, error: res.error };
          }
          return { success: false, error: res.error };
        }

        // Apply server verified state
        if (res.isWishlisted) {
          nextSet.add(productId);
        } else {
          nextSet.delete(productId);
        }
        setWishlistIds(new Set(nextSet));

        return { success: true };
      } catch (err) {
        // Revert optimistic update
        setWishlistIds(wishlistIds);
        return { success: false, error: "Failed to update wishlist." };
      }
    },
    [wishlistIds, pathname, router]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      const nextSet = new Set(wishlistIds);
      nextSet.delete(productId);
      setWishlistIds(nextSet);

      try {
        const res = await removeFromWishlistAction(productId);
        if (!res.success) {
          setWishlistIds(wishlistIds);
          return { success: false, error: res.error };
        }
        return { success: true };
      } catch {
        setWishlistIds(wishlistIds);
        return { success: false, error: "Failed to remove item from wishlist." };
      }
    },
    [wishlistIds]
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistCount: wishlistIds.size,
        isLoading,
        isWishlisted,
        toggleWishlist,
        removeFromWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
