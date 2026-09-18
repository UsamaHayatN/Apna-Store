"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, User, Heart, Menu, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { SessionUser } from "@/types";
import { StorefrontMobileNav } from "./StorefrontMobileNav";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

/* 
  EXACT HEADER & NAVIGATION BAR DECODING:
  - Background: #FFFFFF (Light-100), sticky top positioning, border-b border-[#E5E5E5] (Light-300)
  - Typography: #111111 (Dark-900) bold & medium text, subtitles/inactive #757575 (Dark-700)
  - Left: Brand Logo aligned left
  - Center Navigation: Links for "Men", "Women", "Kids", "Collections", "Contact"
  - Right Utilities: "Search" input/trigger with #F5F5F5 (Light-200) background and "My Cart (2)" count indicator
*/

interface StorefrontHeaderBarProps {
  user: SessionUser | null;
  cartCount?: number;
}

export function StorefrontHeaderBar({ user, cartCount = 0 }: StorefrontHeaderBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const router = useRouter();
  const { cart, openDrawer } = useCart();
  const { wishlistCount } = useWishlist();

  // Reflect live cart item count
  const displayCartCount = cart ? cart.itemCount : cartCount;

  const isAdminOrStaff =
    user && (user.role === "owner" || user.role === "admin" || user.role === "staff");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      router.push(`/search?q=${encodeURIComponent(quickSearch.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const centerNavLinks = [
    { title: "Men", href: "/category/men" },
    { title: "Women", href: "/category/women" },
    { title: "Kids", href: "/category/kids" },
    { title: "Collections", href: "/collections" },
    { title: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* Header Container: White Background (#FFFFFF), Border #E5E5E5 */}
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 bg-[#FFFFFF]">
        {/* LEFT: Brand Logo Aligned Left (#111111) */}
        <div className="flex items-center gap-4">
          {/* Mobile menu trigger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile navigation menu"
            className="p-2 text-[#111111] hover:text-[#757575] focus:outline-none lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link
            href="/"
            aria-label={`${siteConfig.brandName} Homepage`}
            className="text-xl sm:text-2xl font-black tracking-tighter uppercase text-[#111111] hover:opacity-90 transition-opacity"
          >
            {siteConfig.brandName}
          </Link>
        </div>

        {/* CENTER NAVIGATION: Links for "Men", "Women", "Kids", "Collections", "Contact" (#111111) */}
        <nav
          aria-label="Primary Center Navigation"
          className="hidden lg:flex items-center space-x-8 text-sm font-semibold tracking-normal text-[#111111]"
        >
          {centerNavLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="py-2 text-[#111111] hover:text-[#757575] transition-colors relative group"
            >
              <span>{item.title}</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#111111] transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* RIGHT UTILITIES: "Search" input/trigger and "My Cart (2)" count indicator */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-[#111111]">
          {/* Admin shortcut for authorized staff */}
          {isAdminOrStaff && (
            <Link
              href="/admin"
              className="hidden xl:inline-flex items-center gap-1.5 bg-[#111111] text-[#FFFFFF] text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-full hover:bg-neutral-800 transition-colors mr-1"
            >
              <ShieldCheck className="h-3 w-3 text-amber-400" />
              <span>Admin</span>
            </Link>
          )}

          {/* Search Trigger / Input (#F5F5F5 background, #757575 text/icon) */}
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <div className="relative flex items-center">
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search"
                className="w-36 lg:w-44 xl:w-48 bg-[#F5F5F5] hover:bg-[#E5E5E5] focus:bg-[#FFFFFF] text-xs text-[#111111] placeholder-[#757575] rounded-full py-2 pl-9 pr-3 border border-transparent focus:border-[#111111] transition-all outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute left-3 text-[#757575] hover:text-[#111111] transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Mobile search button */}
          <Link
            href="/search"
            className="p-2 text-[#111111] hover:text-[#757575] transition-colors md:hidden"
            aria-label="Search Catalog"
          >
            <Search className="h-5 w-5" />
          </Link>

          {/* Curated Wishlist Icon (#111111) */}
          <Link
            href="/account/wishlist"
            className="relative p-2 text-[#111111] hover:text-[#757575] transition-colors hidden sm:flex items-center justify-center rounded-full hover:bg-[#F5F5F5]"
            aria-label={`Curated Wishlist${wishlistCount > 0 ? ` (${wishlistCount} items)` : ""}`}
          >
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#111111] text-[9px] font-bold text-white leading-none">
                {wishlistCount > 9 ? "9+" : wishlistCount}
              </span>
            )}
          </Link>

          {/* Client Account Link (#111111) */}
          <Link
            href="/account"
            className="p-2 text-[#111111] hover:text-[#757575] transition-colors hidden sm:flex items-center justify-center rounded-full hover:bg-[#F5F5F5]"
            aria-label={user ? `Signed in as ${user.firstName}` : "Sign In to Account"}
          >
            <User className="h-5 w-5" />
          </Link>

          {/* Right Utility: Cart count indicator (#111111 text, #F5F5F5 hover, pill styling) */}
          <Link
            href="/cart"
            id="header-my-cart-button"
            onClick={(e) => {
              e.preventDefault();
              openDrawer();
            }}
            className="flex items-center gap-2 bg-[#F5F5F5] hover:bg-[#E5E5E5] px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-[#111111] transition-colors"
            aria-label={`Shopping Bag containing ${displayCartCount} items`}
          >
            <ShoppingBag className="h-4 w-4 text-[#111111]" />
            <span className="whitespace-nowrap">
              My Cart <span className="font-bold text-[#111111]">({displayCartCount})</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Accessible Mobile Slide Drawer with Matching Architecture */}
      <StorefrontMobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        cartCount={displayCartCount}
      />
    </>
  );
}
