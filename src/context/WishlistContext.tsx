"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
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
  const [isLoading, setIsLoading] = useState(false); // Start false — lazy fetch
  const hasFetchedRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshWishlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const ids = await getWishlistProductIdsAction();
      setWishlistIds(new Set(ids));
    } catch (err) {
      console.warn("Could not refresh wishlist:", err);
    } finally {
      hasFetchedRef.current = true;
      setIsLoading(false);
    }
  }, []);

  // NO useEffect — wishlist is fetched lazily when needed.

  const isWishlisted = useCallback(
    (productId: string) => {
      return wishlistIds.has(productId);
    },
    [wishlistIds]
  );

  const toggleWishlist = useCallback(
    async (productId: string, variantId?: string | null) => {
      // Lazy-fetch wishlist if not yet fetched
      if (!hasFetchedRef.current) {
        await refreshWishlist();
      }

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
    [wishlistIds, pathname, router, refreshWishlist]
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
