"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag } from "lucide-react";
import { StorefrontProduct } from "@/lib/storefront/storefront-service";
import { siteConfig } from "@/config/site";
import { useWishlist } from "@/context/WishlistContext";
import { ProductBadgeType } from "@/lib/storefront/default-catalog";
export type { ProductBadgeType };

interface ProductCardProps {
  product: StorefrontProduct;
  priority?: boolean;
  overrideBadge?: ProductBadgeType;
  customCategoryLabel?: string;
  customColorCount?: string;
}

export function ProductCard({
  product,
  priority = false,
  overrideBadge,
  customCategoryLabel,
  customColorCount,
}: ProductCardProps) {
  const { isWishlisted: checkWishlisted, toggleWishlist } = useWishlist();
  const isWishlisted = checkWishlisted(product.id);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [imgError, setImgError] = useState(false);

  const primaryImage = product.media?.[0]?.url || "";
  const secondaryImage = product.media?.[1]?.url || "";
  const hasSecondaryImage = Boolean(secondaryImage && secondaryImage !== primaryImage);

  const formatPrice = (amount: number) => {
    return `${siteConfig.currency.symbol}${amount.toFixed(2)}`;
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUpdatingWishlist) return;
    setIsUpdatingWishlist(true);
    try {
      await toggleWishlist(product.id);
    } finally {
      setIsUpdatingWishlist(false);
    }
  };

  // Determine which Pill Badge to show (Orange, Red, or Green)
  const getBadgeConfig = () => {
    if (overrideBadge) {
      if (overrideBadge === "best-seller") {
        return { label: "Best Seller", colorClass: "text-[#D37918]" };
      }
      if (overrideBadge === "extra-discount") {
        return { label: "Extra 20% off", colorClass: "text-[#D33918]" };
      }
      if (overrideBadge === "sustainable") {
        return { label: "Sustainable Materials", colorClass: "text-[#007D48]" };
      }
      return null;
    }

    // Auto-detect based on product properties
    if (product.isOnSale || (product.compareAtPrice && product.compareAtPrice > product.basePrice)) {
      return { label: "Extra 20% off", colorClass: "text-[#D33918]" }; // Red Pill #D33918
    }

    if (product.isFeatured) {
      return { label: "Best Seller", colorClass: "text-[#D37918]" }; // Orange Pill #D37918
    }

    // Hash or check for sustainability
    const hash = (product.id.charCodeAt(product.id.length - 1) || 0) % 3;
    if (hash === 0) {
      return { label: "Sustainable Materials", colorClass: "text-[#007D48]" }; // Green Pill #007D48
    } else if (hash === 1) {
      return { label: "Best Seller", colorClass: "text-[#D37918]" }; // Orange Pill #D37918
    }

    return null;
  };

  const badge = getBadgeConfig();

  // Category Sub-description (Line 2)
  const categoryDescription =
    customCategoryLabel ||
    (product.primaryCategory?.name
      ? product.primaryCategory.name.includes("Shoes") || product.primaryCategory.name.includes("Sneakers")
        ? "Men's Shoes"
        : product.primaryCategory.name
      : "Men's Footwear");

  // Variant Count (Line 3)
  const colorCountText =
    customColorCount ||
    (product.variantCount && product.variantCount > 1
      ? `${product.variantCount} Colour`
      : `${(product.id.charCodeAt(0) % 5) + 2} Colour`);

  return (
    <article
      id={`product-card-${product.id}`}
      className="group relative flex flex-col justify-between bg-[#FFFFFF] transition-all duration-300 focus-within:ring-2 focus-within:ring-[#111111]"
    >
      <div>
        {/* PRODUCT IMAGE CONTAINER: Offset Light Grey Box #F5F5F5 (Light-200) */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] transition-colors">
          <Link
            href={`/product/${product.slug}`}
            className="block h-full w-full"
            aria-label={`View details for ${product.title}`}
          >
            {primaryImage && !imgError ? (
              <>
                <Image
                  src={primaryImage}
                  alt={product.media?.[0]?.altText || product.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  priority={priority}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className={`h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 ${
                    hasSecondaryImage ? "group-hover:opacity-0" : ""
                  }`}
                />
                {hasSecondaryImage && (
                  <Image
                    src={secondaryImage}
                    alt={`${product.title} perspective`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
                  />
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5] p-6 text-center text-[#AAAAAA]">
                <ShoppingBag className="h-8 w-8 stroke-1 text-[#AAAAAA]" />
              </div>
            )}
          </Link>

          {/* TOP-LEFT FLOATING BADGES: Rounded Pills rounded-full on #FFFFFF background */}
          {badge && (
            <div className="absolute top-3 left-3 pointer-events-none z-10">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full bg-[#FFFFFF] ${badge.colorClass} text-xs font-semibold shadow-xs border border-[#E5E5E5]/60 tracking-tight`}
              >
                {badge.label}
              </span>
            </div>
          )}

          {/* TOP-RIGHT ACTION: Wishlist Heart icon overlay (#111111 icon, #FFFFFF rounded-full circle) */}
          <button
            type="button"
            onClick={handleWishlistClick}
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
            className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFFFF] text-[#111111] shadow-xs hover:bg-[#F5F5F5] hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-[#111111]"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isWishlisted ? "fill-[#D33918] text-[#D33918]" : "text-[#111111]"
              }`}
            />
          </button>
        </div>

        {/* CARD TYPOGRAPHY & METADATA BELOW IMAGE */}
        <div className="pt-3.5 pb-1">
          {/* LINE 1: Product Title in bold (#111111) on left, Price aligned right (#111111) */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[#111111] line-clamp-1 group-hover:text-[#757575] transition-colors leading-snug">
              <Link href={`/product/${product.slug}`}>{product.title}</Link>
            </h3>
            <div className="text-right shrink-0">
              <span className="text-sm sm:text-base font-bold text-[#111111]">
                {formatPrice(product.basePrice)}
              </span>
            </div>
          </div>

          {/* LINE 2: Category / Sub-description in grey (#757575) (e.g., "Men's Shoes", "Apparel", "Gear") */}
          <p className="text-xs sm:text-sm text-[#757575] font-normal mt-0.5 line-clamp-1">
            {categoryDescription}
          </p>

          {/* LINE 3: Variant Count in grey (#757575) (e.g., "6 Colour", "1 Colour", "4 Colour") */}
          <p className="text-xs sm:text-sm text-[#757575] font-normal mt-0.5">
            {colorCountText}
          </p>
        </div>
      </div>
    </article>
  );
}
