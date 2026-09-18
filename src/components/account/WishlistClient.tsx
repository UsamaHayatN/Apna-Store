"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ShoppingBag, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { WishlistItemDetail } from "@/lib/wishlist/wishlist-service";
import { removeFromWishlistAction, moveWishlistToCartAction } from "@/app/actions/wishlist";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { siteConfig } from "@/config/site";

interface WishlistClientProps {
  initialItems: WishlistItemDetail[];
  isGuest: boolean;
}

export function WishlistClient({ initialItems, isGuest }: WishlistClientProps) {
  const [items, setItems] = useState<WishlistItemDetail[]>(initialItems);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const { refreshCart, openDrawer } = useCart();
  const { refreshWishlist } = useWishlist();

  const handleRemove = async (productId: string) => {
    setActionLoadingId(productId);
    setFeedback(null);
    try {
      const res = await removeFromWishlistAction(productId);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.productId !== productId));
        await refreshWishlist();
        setFeedback({ type: "success", message: "Silhouette removed from your curated wishlist." });
      } else {
        setFeedback({ type: "error", message: res.error || "Could not remove item." });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to remove item. Please retry." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMoveToCart = async (item: WishlistItemDetail) => {
    if (!item.isAvailable) {
      setFeedback({
        type: "error",
        message: "This atelier piece is currently not available for acquisition.",
      });
      return;
    }

    setActionLoadingId(item.productId);
    setFeedback(null);
    try {
      const res = await moveWishlistToCartAction(item.productId, item.variantId);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.productId !== item.productId));
        await refreshWishlist();
        await refreshCart();
        openDrawer();
        setFeedback({
          type: "success",
          message: `${item.productTitle} moved to your bespoke shopping bag.`,
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Unable to move to shopping bag." });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to add to bag. Please try again." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatPrice = (amount: number) => {
    return `${siteConfig.currency.symbol}${amount.toFixed(2)}`;
  };

  if (isGuest) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center max-w-md mx-auto">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-900">
            <Heart className="h-6 w-6 stroke-1" />
          </div>
          <h1 className="text-2xl font-light uppercase tracking-tight text-neutral-950">
            Private Client Wishlist
          </h1>
          <p className="mt-3 text-xs text-neutral-600 leading-relaxed font-light">
            Sign in to access your curated wishlist, sync saved silhouettes across your personal devices, and receive atelier restock updates.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/account?redirect=/account/wishlist"
              className="inline-flex items-center justify-center gap-2 bg-neutral-950 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-neutral-800 transition-colors"
            >
              <span>Sign In to Account</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 border border-neutral-300 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              <span>Explore Collection</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center space-x-2 text-[11px] font-medium uppercase tracking-widest text-neutral-400 mb-8 border-b border-neutral-200 pb-4">
        <Link href="/account" className="hover:text-neutral-900 transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          <span>Client Account</span>
        </Link>
        <span>/</span>
        <span className="text-neutral-950 font-semibold">Curated Wishlist</span>
      </div>

      {/* Header Title & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between pb-6 mb-8 border-b border-neutral-200 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-tight text-neutral-950">
            Curated Wishlist
          </h1>
          <p className="mt-1 text-xs text-neutral-500 font-light">
            Your private selection of atelier footwear and seasonal capsule drops.
          </p>
        </div>
        <div className="text-xs text-neutral-500 uppercase tracking-widest font-mono">
          {items.length} {items.length === 1 ? "Item Saved" : "Items Saved"}
        </div>
      </div>

      {/* Feedback Toast Notification */}
      {feedback && (
        <div
          className={`mb-6 p-4 flex items-center gap-3 text-xs border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="border border-dashed border-neutral-300 p-12 sm:p-16 text-center bg-neutral-50/60 my-8">
          <Heart className="mx-auto h-10 w-10 text-neutral-300 stroke-1 mb-4" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
            Your Curated Wishlist is Currently Empty
          </h3>
          <p className="mt-2 max-w-md mx-auto text-xs text-neutral-600 leading-relaxed font-light">
            Explore our permanent footwear collection and tap the heart icon on any pair to preserve your bespoke shortlist.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-neutral-950 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-neutral-800 transition-colors"
            >
              <span>Explore Footwear Collection</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Wishlist Item Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => {
            const isProcessing = actionLoadingId === item.productId;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between border border-neutral-200 bg-white hover:shadow-xs transition-shadow duration-300"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        <ShoppingBag className="h-8 w-8 stroke-1" />
                      </div>
                    )}

                    {/* Stock / Availability Status Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      {item.isAvailable ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white text-[10px] font-semibold text-emerald-800 border border-neutral-200 shadow-xs uppercase tracking-wider">
                          In Atelier
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-900 text-[10px] font-semibold text-white uppercase tracking-wider">
                          Unavailable
                        </span>
                      )}
                    </div>

                    {/* Quick Remove Button */}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId)}
                      disabled={isProcessing}
                      aria-label="Remove from wishlist"
                      className="absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 hover:text-rose-600 hover:bg-neutral-50 transition-colors shadow-xs border border-neutral-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                      {item.brand}
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-neutral-950 line-clamp-1 hover:text-neutral-600 transition-colors">
                      <Link href={`/product/${item.productSlug}`}>
                        {item.productTitle}
                      </Link>
                    </h3>

                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-sm font-bold text-neutral-950">
                        {formatPrice(item.basePrice)}
                      </span>
                      {item.compareAtPrice && item.compareAtPrice > item.basePrice && (
                        <span className="text-xs text-neutral-400 line-through">
                          {formatPrice(item.compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="border-t border-neutral-100 p-4 pt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(item)}
                    disabled={isProcessing || !item.isAvailable}
                    className={`w-full py-2.5 px-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                      item.isAvailable
                        ? "bg-neutral-950 text-white hover:bg-neutral-800"
                        : "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>{item.isAvailable ? "Move to Bag" : "Currently Unavailable"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.productId)}
                    disabled={isProcessing}
                    className="w-full text-center text-[11px] text-neutral-400 hover:text-rose-600 transition-colors py-1"
                  >
                    Remove Silhouette
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
