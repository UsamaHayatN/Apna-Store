import { Suspense } from "react";
import { StorefrontHeader } from "@/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/components/layout/StorefrontFooter";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CartDrawer } from "@/components/cart/CartDrawer";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <WishlistProvider>
        <div className="flex min-h-screen flex-col bg-white">
          <StorefrontHeader />
          <main className="flex-1">
            <Suspense
              fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
                    <span className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">
                      Loading...
                    </span>
                  </div>
                </div>
              }
            >
              {children}
            </Suspense>
          </main>
          <StorefrontFooter />
          <CartDrawer />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}
