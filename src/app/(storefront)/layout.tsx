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
          <main className="flex-1">{children}</main>
          <StorefrontFooter />
          <CartDrawer />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}
