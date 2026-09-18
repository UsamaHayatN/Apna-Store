"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function CartDrawer() {
  const { cart, isDrawerOpen, closeDrawer, updateQuantity, removeItem, isMutating } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeDrawerRef = useRef(closeDrawer);
  closeDrawerRef.current = closeDrawer;

  // Close on Escape key
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawerRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const items = cart?.items || [];
  const itemCount = cart?.itemCount || 0;
  const subtotal = cart?.subtotal || 0;
  const freeShippingThreshold = cart?.freeShippingThreshold || 150;
  const freeShippingQualified = cart?.freeShippingQualified || false;
  const amountUntilFreeShipping = cart?.amountUntilFreeShipping || 0;
  const shippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag Drawer"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md bg-white border-l border-neutral-200 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#111111]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                Shopping Bag ({itemCount})
              </h2>
            </div>
            <button
              onClick={closeDrawer}
              className="p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors"
              aria-label="Close Shopping Bag"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-xs">
            <div className="flex justify-between items-center mb-1.5 font-medium text-[#111111]">
              <span>
                {freeShippingQualified ? (
                  <span className="text-[#007D48] font-semibold">
                    ✓ You have unlocked Complimentary Standard Shipping
                  </span>
                ) : (
                  <span>
                    Add <strong className="text-[#111111]">${amountUntilFreeShipping.toFixed(2)}</strong> for Complimentary Shipping
                  </span>
                )}
              </span>
              <span className="text-neutral-500">{shippingProgress}%</span>
            </div>
            <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#111111] h-full transition-all duration-300 rounded-full"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>

          {/* Line Items Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 divide-y divide-neutral-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4 text-neutral-400">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                  Your Bag is Currently Empty
                </h3>
                <p className="text-xs text-neutral-500 mt-1.5 max-w-xs">
                  Discover our handcrafted footwear and premium men&apos;s essentials.
                </p>
                <button
                  onClick={closeDrawer}
                  className="mt-6"
                >
                  <Link
                    href="/shop"
                    className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#111111] text-white hover:bg-neutral-800 transition-colors rounded-full"
                  >
                    Explore Catalog
                  </Link>
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-4 flex gap-4">
                  {/* Thumbnail */}
                  <div className="relative w-20 h-24 bg-[#F5F5F5] rounded-md overflow-hidden shrink-0 border border-neutral-200/60">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        fill
                        className="object-cover object-center"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                            {item.brand}
                          </p>
                          <Link
                            href={`/product/${item.productSlug}`}
                            onClick={closeDrawer}
                            className="text-xs font-semibold text-[#111111] hover:underline line-clamp-1"
                          >
                            {item.productTitle}
                          </Link>
                        </div>
                        <span className="text-xs font-semibold text-[#111111] shrink-0">
                          ${item.lineTotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Variant attributes */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Object.entries(item.variantAttributes).map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-block text-[10px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-sm capitalize"
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>

                      {item.stockStatus === "low_stock" && (
                        <p className="text-[10px] font-medium text-[#D37918] mt-1">
                          Low Stock — Only {item.availableStock} remaining
                        </p>
                      )}
                      {item.stockStatus === "out_of_stock" && (
                        <p className="text-[10px] font-medium text-[#D33918] mt-1">
                          Currently Out of Stock
                        </p>
                      )}
                    </div>

                    {/* Quantity controls & Remove */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-neutral-100">
                      <div className="flex items-center border border-neutral-200 rounded-sm bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={isMutating}
                          className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-40 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-[#111111] min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isMutating || item.quantity >= Math.min(10, item.availableStock)}
                          className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-40 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={isMutating}
                        className="text-neutral-400 hover:text-[#D33918] transition-colors p-1"
                        aria-label={`Remove ${item.productTitle} from bag`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-neutral-200 p-5 bg-neutral-50/70 space-y-4">
              <div className="space-y-1.5 text-xs text-neutral-600">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-neutral-700">Subtotal</span>
                  <span className="text-sm font-bold text-[#111111]">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500 text-[11px]">
                  <span>Shipping & Taxes</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className="w-full flex items-center justify-center py-2.5 px-4 bg-white border border-neutral-200 text-[#111111] text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-neutral-50 transition-colors"
                >
                  View Full Bag
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-neutral-700" />
                <span>30-Day Size Exchanges • Authentic Craftsmanship</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
