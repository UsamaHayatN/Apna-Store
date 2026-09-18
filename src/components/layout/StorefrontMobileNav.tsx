"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Search,
  ShoppingBag,
  Heart,
  User,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { SessionUser } from "@/types";

interface StorefrontMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: SessionUser | null;
  cartCount?: number;
}

export function StorefrontMobileNav({
  isOpen,
  onClose,
  user,
  cartCount = 0,
}: StorefrontMobileNavProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCloseRef.current();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  const isAdminOrStaff =
    user && (user.role === "owner" || user.role === "admin" || user.role === "staff");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
      className="fixed inset-0 z-50 flex lg:hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity duration-300 ease-out"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative flex w-full max-w-xs sm:max-w-sm flex-col bg-white text-neutral-900 shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-left duration-300">
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5">
          <Link
            href="/"
            onClick={onClose}
            className="text-base font-bold uppercase tracking-widest text-neutral-950"
          >
            {siteConfig.brandName}
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Search Bar */}
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="search"
              placeholder="Search footwear, silhouettes, sizes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs placeholder-neutral-400 focus:border-neutral-900 focus:outline-none"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          </form>
        </div>

        {/* Main Navigation Links */}
        <div className="flex-1 px-4 py-4 space-y-6">
          {/* Primary Categories: Men, Women, Kids, Collections, Contact */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#757575] px-2 mb-2">
              Departments & Highlights
            </div>
            <nav className="space-y-1">
              {[
                { title: "Men", href: "/category/men" },
                { title: "Women", href: "/category/women" },
                { title: "Kids", href: "/category/kids" },
                { title: "Collections", href: "/collections" },
                { title: "Contact", href: "/contact" },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between px-2.5 py-2.5 text-sm font-bold text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors"
                >
                  <span>{item.title}</span>
                  <ChevronRight className="h-4 w-4 text-[#AAAAAA]" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Catalog & Silhouettes */}
          <div className="border-t border-[#E5E5E5] pt-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#757575] px-2 mb-2">
              Footwear & Apparel
            </div>
            <nav className="space-y-1">
              <Link
                href="/shop"
                onClick={onClose}
                className="flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors"
              >
                <span>All Catalog Products</span>
                <ChevronRight className="h-3 w-3 text-[#AAAAAA]" />
              </Link>
              {siteConfig.navigation.categories.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  onClick={onClose}
                  className="flex items-center justify-between px-2.5 py-1.5 text-xs text-[#757575] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors"
                >
                  <span>{cat.title}</span>
                  <span className="text-[10px] text-[#AAAAAA]">Explore</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Customer Shortcuts */}
          <div className="border-t border-[#E5E5E5] pt-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#757575] px-2 mb-2">
              Customer Services
            </div>
            <div className="space-y-1">
              <Link
                href="/cart"
                onClick={onClose}
                className="flex items-center justify-between px-2.5 py-2.5 text-xs text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="h-4 w-4 text-[#111111]" />
                  <span className="font-medium">My Cart</span>
                </div>
                <span className="bg-[#111111] text-[#FFFFFF] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              </Link>

              <Link
                href="/account/wishlist"
                onClick={onClose}
                className="flex items-center justify-between px-2.5 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="h-4 w-4 text-[#111111]" />
                  <span className="font-medium">Curated Wishlist</span>
                </div>
                <ChevronRight className="h-3 w-3 text-[#AAAAAA]" />
              </Link>

              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center justify-between px-2.5 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-[#111111]" />
                  <span className="font-medium">
                    {user ? `${user.firstName}'s Account` : "Client Sign In / Register"}
                  </span>
                </div>
                <ChevronRight className="h-3 w-3 text-[#AAAAAA]" />
              </Link>

              {isAdminOrStaff && (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className="flex items-center justify-between px-2 py-2 text-xs bg-amber-50 text-amber-900 border border-amber-200 mt-2 font-medium"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-700" />
                    <span>Admin Management Portal</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-amber-700" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-neutral-200 bg-neutral-50 p-4">
          <div className="text-[11px] text-neutral-500 space-y-1">
            <p className="font-medium text-neutral-900">Complimentary Global Transit</p>
            <p>Direct tracked delivery on orders over ${siteConfig.inventory.freeShippingThreshold}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
