"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CartSummary } from "@/lib/cart/cart-service";

interface CartContextType {
  cart: CartSummary | null;
  isLoading: boolean;
  isMutating: boolean;
  isDrawerOpen: boolean;
  error: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToCart: (
    productId: string,
    variantId?: string | null,
    quantity?: number
  ) => Promise<{ success: boolean; error?: string }>;
  updateQuantity: (
    itemId: string,
    quantity: number
  ) => Promise<{ success: boolean; error?: string }>;
  removeItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  clearCart: () => Promise<{ success: boolean; error?: string }>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      if (data.success && data.cart) {
        setCart(data.cart);
        setError(null);
      }
    } catch (err: unknown) {
      console.warn("Cart fetch warning:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addToCart = useCallback(
    async (
      productId: string,
      variantId?: string | null,
      quantity: number = 1
    ): Promise<{ success: boolean; error?: string }> => {
      setIsMutating(true);
      setError(null);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, variantId, quantity }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          const errorMsg = data.error || "Unable to add item to shopping bag.";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        setCart(data.cart);
        // Auto-open drawer for instant customer feedback
        setIsDrawerOpen(true);
        return { success: true };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Connection error. Please try again.";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const updateQuantity = useCallback(
    async (
      itemId: string,
      quantity: number
    ): Promise<{ success: boolean; error?: string }> => {
      setIsMutating(true);
      setError(null);
      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, quantity }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          const errorMsg = data.error || "Unable to update item quantity.";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        setCart(data.cart);
        return { success: true };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Connection error. Please try again.";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<{ success: boolean; error?: string }> => {
      setIsMutating(true);
      setError(null);
      try {
        const res = await fetch(`/api/cart?itemId=${encodeURIComponent(itemId)}`, {
          method: "DELETE",
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          const errorMsg = data.error || "Unable to remove item from shopping bag.";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        setCart(data.cart);
        return { success: true };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Connection error. Please try again.";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const clearCart = useCallback(
    async (): Promise<{ success: boolean; error?: string }> => {
      setIsMutating(true);
      setError(null);
      try {
        const res = await fetch("/api/cart?clear=true", {
          method: "DELETE",
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          const errorMsg = data.error || "Unable to clear shopping bag.";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        setCart(data.cart);
        return { success: true };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Connection error. Please try again.";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const contextValue = React.useMemo(
    () => ({
      cart,
      isLoading,
      isMutating,
      isDrawerOpen,
      error,
      openDrawer,
      closeDrawer,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      refreshCart: fetchCart,
    }),
    [
      cart,
      isLoading,
      isMutating,
      isDrawerOpen,
      error,
      openDrawer,
      closeDrawer,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      fetchCart,
    ]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
