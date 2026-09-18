"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Truck,
  RotateCcw,
  Lock,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

export function CartPageView() {
  const { cart, isLoading, isMutating, updateQuantity, removeItem, clearCart } = useCart();

  if (isLoading && !cart) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-neutral-200 rounded-sm w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-4">
              <div className="h-32 bg-neutral-100 rounded-sm" />
              <div className="h-32 bg-neutral-100 rounded-sm" />
            </div>
            <div className="lg:col-span-4">
              <div className="h-64 bg-neutral-100 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const itemCount = cart?.itemCount || 0;
  const subtotal = cart?.subtotal || 0;
  const freeShippingThreshold = cart?.freeShippingThreshold || 150;
  const freeShippingQualified = cart?.freeShippingQualified || false;
  const amountUntilFreeShipping = cart?.amountUntilFreeShipping || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-neutral-200 pb-6 mb-8 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight uppercase text-neutral-950">
            Shopping Bag
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            {itemCount > 0
              ? `You have ${itemCount} ${itemCount === 1 ? "item" : "items"} in your shopping bag`
              : "Your shopping bag is currently empty"}
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              let confirmed = true;
              try {
                confirmed = window.confirm("Are you sure you want to clear your shopping bag?");
              } catch {
                confirmed = true;
              }
              if (confirmed) {
                clearCart();
              }
            }}
            disabled={isMutating}
            className="text-xs text-neutral-400 hover:text-[#D33918] transition-colors self-start sm:self-auto"
          >
            Clear Entire Bag
          </button>
        )}
      </div>

      {items.length === 0 ? (
        /* Empty Bag State */
        <div className="border border-neutral-200 p-12 sm:p-16 text-center bg-neutral-50/50 rounded-sm">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <ShoppingBag className="h-8 w-8 stroke-1" />
          </div>
          <h2 className="text-base font-semibold uppercase tracking-wider text-neutral-900">
            Your Bag is Currently Empty
          </h2>
          <p className="mt-2 max-w-sm mx-auto text-xs text-neutral-500 leading-relaxed">
            Explore our handcrafted Italian footwear, tailoring, and curated wardrobe essentials.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center px-6 py-3 text-xs font-semibold uppercase tracking-wider bg-[#111111] text-white hover:bg-neutral-800 transition-colors rounded-sm"
            >
              Explore All Footwear
            </Link>
            <Link
              href="/category/men"
              className="inline-flex items-center justify-center px-6 py-3 text-xs font-semibold uppercase tracking-wider border border-neutral-300 text-neutral-900 hover:bg-neutral-100 transition-colors rounded-sm"
            >
              View Men&apos;s Collection
            </Link>
          </div>
        </div>
      ) : (
        /* Full Bag Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-8 space-y-6">
            {/* Free Shipping Banner */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm flex items-center gap-3 text-xs">
              <Truck className="h-5 w-5 text-[#111111] shrink-0" />
              <div className="flex-1">
                {freeShippingQualified ? (
                  <p className="font-medium text-[#007D48]">
                    ✓ You have qualified for <strong>Complimentary Standard Delivery</strong>
                  </p>
                ) : (
                  <p className="text-neutral-700">
                    Add <strong className="text-neutral-950">${amountUntilFreeShipping.toFixed(2)}</strong> more to unlock <strong>Complimentary Standard Shipping</strong>.
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table/Cards */}
            <div className="border border-neutral-200 divide-y divide-neutral-200 rounded-sm bg-white overflow-hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6"
                >
                  {/* Item Image */}
                  <div className="relative w-24 h-28 sm:w-28 sm:h-32 bg-[#F5F5F5] rounded-sm overflow-hidden shrink-0 border border-neutral-200/70">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        fill
                        className="object-cover object-center"
                        sizes="(max-width: 640px) 96px, 112px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300">
                        <ShoppingBag className="h-8 w-8 stroke-1" />
                      </div>
                    )}
                  </div>

                  {/* Item Info & Actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                            {item.brand}
                          </p>
                          <Link
                            href={`/product/${item.productSlug}`}
                            className="text-sm sm:text-base font-medium text-neutral-950 hover:underline line-clamp-1 mt-0.5"
                          >
                            {item.productTitle}
                          </Link>
                          {item.variantSku && (
                            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                              SKU: {item.variantSku}
                            </p>
                          )}
                        </div>

                        {/* Price Display */}
                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-semibold text-neutral-950">
                            ${item.lineTotal.toFixed(2)}
                          </span>
                          {item.quantity > 1 && (
                            <p className="text-[11px] text-neutral-500">
                              (${item.unitPrice.toFixed(2)} each)
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Variant Attributes Tags */}
                      {Object.keys(item.variantAttributes).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(item.variantAttributes).map(([key, val]) => (
                            <span
                              key={key}
                              className="inline-flex items-center text-[11px] font-medium bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-sm capitalize"
                            >
                              <span className="text-neutral-500 mr-1">{key}:</span> {val}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stock Warnings */}
                      {item.stockStatus === "low_stock" && (
                        <p className="text-xs font-medium text-[#D37918] mt-2">
                          Only {item.availableStock} units remaining in stock.
                        </p>
                      )}
                      {item.stockStatus === "out_of_stock" && (
                        <p className="text-xs font-medium text-[#D33918] mt-2">
                          Currently out of stock. Please remove to proceed.
                        </p>
                      )}
                    </div>

                    {/* Bottom row: Quantity Stepper + Remove */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 mr-1">Qty:</span>
                        <div className="flex items-center border border-neutral-200 rounded-sm bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={isMutating}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-40 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-3 text-xs font-semibold text-neutral-950 min-w-[28px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={
                              isMutating ||
                              item.quantity >= Math.min(10, item.availableStock)
                            }
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-40 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={isMutating}
                        className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-[#D33918] transition-colors p-1"
                        aria-label={`Remove ${item.productTitle} from bag`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Shopping Link */}
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-4">
            <div className="border border-neutral-200 p-6 bg-neutral-50 rounded-sm sticky top-28 space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 border-b border-neutral-200 pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                  <span className="font-semibold text-neutral-950">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Shipping</span>
                  <span>
                    {freeShippingQualified ? (
                      <span className="font-semibold text-[#007D48]">FREE</span>
                    ) : (
                      "Calculated at checkout"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 flex justify-between items-baseline text-sm font-semibold uppercase tracking-wider text-neutral-950">
                <span>Estimated Total</span>
                <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
              </div>

              <Link href="/checkout" className="block w-full">
                <button
                  type="button"
                  disabled={cart?.hasUnavailableItems}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#111111] hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </button>
              </Link>

              {cart?.hasUnavailableItems && (
                <p className="text-xs text-[#D33918] text-center">
                  Please remove out-of-stock items before checking out.
                </p>
              )}

              {/* Trust Indicators */}
              <div className="border-t border-neutral-200 pt-5 space-y-3 text-[11px] text-neutral-500">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-neutral-700 shrink-0" />
                  <span>Complimentary 30-day returns & size exchanges</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="h-4 w-4 text-neutral-700 shrink-0" />
                  <span>Carbon neutral shipping on all orders</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Lock className="h-4 w-4 text-neutral-700 shrink-0" />
                  <span>256-bit encrypted secure checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
