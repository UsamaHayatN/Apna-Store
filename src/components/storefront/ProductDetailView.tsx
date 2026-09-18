"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  ShoppingBag,
  Star,
  ChevronDown,
  ChevronUp,
  Truck,
  RotateCcw,
  ShieldCheck,
  Ruler,
  Check,
  X,
  Camera,
  ThumbsUp,
  Plus,
  Minus,
  AlertCircle,
} from "lucide-react";
import { StorefrontProduct } from "@/lib/storefront/storefront-service";
import { ProductCard, ProductBadgeType } from "@/components/storefront/ProductCard";
import { siteConfig } from "@/config/site";
import { useCart } from "@/context/CartContext";
import { PdpVariant, PdpAttribute, PdpBreadcrumb } from "@/lib/storefront/pdp-service";

/* 
  PRODUCT DETAIL PAGE (PDP) DESIGN SYSTEM SPECIFICATIONS:
  - Exact Color Palette:
    * #111111: Primary text, bold headers, active size borders, primary CTA background
    * #757575: Subtitles, secondary descriptions, category labels, review counts
    * #AAAAAA: Inactive icons, subtle borders, disabled diagonal stroke
    * #FFFFFF: Canvas, badge pills, wishlist button circle, modals
    * #F5F5F5: Product image container, swatch boxes, accordion backgrounds
    * #E5E5E5: Clean dividing lines, size button default borders
    * #D37918: Orange Pill for "Best Seller"
    * #D33918: Red Pill for "Extra 20% off" / Sale & wishlist fill
    * #007D48: Green Pill for "Sustainable Materials" & verified buyer badge
  - Layout:
    * Left Column: Media Gallery & Showcase Canvas (Desktop vertical thumbnails + zoom-on-hover showcase)
    * Right Column: Sticky Product Information & Purchase Column
    * Lower Section: Nike-style Accordion Drawers (Shipping, Specs, Reviews)
    * Recommended Section: "You Might Also Like" 4-card grid with exact ProductCard layout
    * Mobile Sticky CTA: Bottom bar activating when scrolled past main purchase button
*/

export interface ColorwayOption {
  id: string;
  name: string;
  thumbnailUrl: string;
  colorHex: string;
  images: string[];
}

export interface SizeOption {
  size: string;
  inStock: boolean;
  isPopular?: boolean;
}

export interface ReviewItem {
  id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  sizePurchased: string;
  verified: boolean;
  title: string;
  content: string;
  helpfulCount: number;
  userPhotos?: string[];
  fitFeedback: "Runs Small" | "True to Size" | "Runs Large";
}

export interface ProductDetailData extends StorefrontProduct {
  gender?: "men" | "women" | "unisex";
  height?: string;
  sport?: string;
  badgeType?: ProductBadgeType;
  customCategoryTag?: string;
  colorways?: ColorwayOption[];
  sizes?: SizeOption[];
  styleCode?: string;
  materials?: string[];
  reviews?: ReviewItem[];
  // Generic PDP Extensions
  attributes?: PdpAttribute[];
  variants?: PdpVariant[];
  breadcrumbs?: PdpBreadcrumb[];
  specifications?: { label: string; value: string }[];
  inStock?: boolean;
}

interface ProductDetailViewProps {
  product: ProductDetailData;
  recommendedProducts?: StorefrontProduct[];
}

export function ProductDetailView({
  product,
  recommendedProducts = [],
}: ProductDetailViewProps) {
  // 1. Colorway & Media State
  const defaultColorways: ColorwayOption[] = product.colorways && product.colorways.length > 0
    ? product.colorways
    : [
        {
          id: "cw-1",
          name: "Summit White / Pure Platinum / Black",
          thumbnailUrl: product.media?.[0]?.url || "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
          colorHex: "#FFFFFF",
          images: [
            product.media?.[0]?.url || "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
            product.media?.[1]?.url || "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
          ],
        },
        {
          id: "cw-2",
          name: "Black / Anthracite / Smoke Grey",
          thumbnailUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
          colorHex: "#111111",
          images: [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
          ],
        },
        {
          id: "cw-3",
          name: "Vast Grey / University Blue / Sail",
          thumbnailUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80",
          colorHex: "#D8E2DC",
          images: [
            "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80",
          ],
        },
      ];

  const [selectedColorway, setSelectedColorway] = useState<ColorwayOption>(defaultColorways[0]);
  const activeImages = selectedColorway.images;
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // 2. Image Zoom on Hover
  const [isZooming, setIsZooming] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 50, y: 50 });
  const showcaseRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showcaseRef.current) return;
    const { left, top, width, height } = showcaseRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomCoords({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  // 3. Wishlist State
  const [isWishlisted, setIsWishlisted] = useState(false);

  // 4. Size Selection
  const isApparel =
    product.primaryCategory?.slug === "clothing" ||
    product.title.toLowerCase().includes("jacket") ||
    product.title.toLowerCase().includes("tee") ||
    product.title.toLowerCase().includes("hoodie");

  const defaultSizes: SizeOption[] = isApparel
    ? [
        { size: "XS", inStock: true },
        { size: "S", inStock: true },
        { size: "M", inStock: true },
        { size: "L", inStock: true },
        { size: "XL", inStock: true },
        { size: "XXL", inStock: false },
      ]
    : [
        { size: "US 7", inStock: true },
        { size: "US 7.5", inStock: true },
        { size: "US 8", inStock: true },
        { size: "US 8.5", inStock: true },
        { size: "US 9", inStock: true },
        { size: "US 9.5", inStock: true },
        { size: "US 10", inStock: true, isPopular: true },
        { size: "US 10.5", inStock: true },
        { size: "US 11", inStock: true },
        { size: "US 11.5", inStock: false },
        { size: "US 12", inStock: true },
        { size: "US 13", inStock: false },
      ];

  const availableSizes = product.sizes || defaultSizes;
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [attributeError, setAttributeError] = useState<string | null>(null);

  // Real Cart Hook
  const { addToCart, isMutating } = useCart();

  // Generic Attribute Matrix & Quantity State
  const initialAttributes = () => {
    if (product.variants && product.variants.length > 0) {
      const inStockVar = product.variants.find((v) => v.inStock);
      if (inStockVar && inStockVar.attributes) {
        return { ...inStockVar.attributes };
      }
      return { ...product.variants[0].attributes };
    }
    return {};
  };

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(initialAttributes);
  const [quantity, setQuantity] = useState<number>(1);

  // Resolve matching variant from selectedAttributes
  const selectedVariant = product.variants?.find((v) => {
    if (!v.attributes) return false;
    return Object.entries(selectedAttributes).every(
      ([k, val]) => v.attributes[k]?.toLowerCase() === val?.toLowerCase()
    );
  });

  // Effective price & availability calculations
  const effectivePrice = selectedVariant ? selectedVariant.price : product.basePrice;
  const effectiveCompareAt = selectedVariant
    ? selectedVariant.compareAtPrice
    : product.compareAtPrice;
  const isEffectiveSale = effectiveCompareAt ? effectiveCompareAt > effectivePrice : product.isOnSale;
  const isVariantInStock = selectedVariant ? selectedVariant.inStock : product.inStock !== false;
  const maxAvailableStock = selectedVariant?.availableQuantity ?? 10;
  const isLowStock = selectedVariant ? selectedVariant.isLowStock : false;
  const effectiveSku = selectedVariant?.sku || product.styleCode || product.modelCode;

  // 5. Add to Bag Feedback & Bag Drawer
  const [isAddingToBag, setIsAddingToBag] = useState(false);
  const [showBagToast, setShowBagToast] = useState(false);
  const [bagCount, setBagCount] = useState(1);

  // 6. Sticky CTA Bar on Mobile Scroll
  const purchaseBoxRef = useRef<HTMLDivElement>(null);
  const [showMobileStickyBar, setShowMobileStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!purchaseBoxRef.current) return;
      const rect = purchaseBoxRef.current.getBoundingClientRect();
      // If purchase box has scrolled above viewport, show sticky bottom bar on mobile
      setShowMobileStickyBar(rect.bottom < 60);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 7. Lower Accordion Drawers
  const [accordions, setAccordions] = useState({
    shipping: true,
    specs: true,
    reviews: true,
  });

  const toggleAccordion = (key: keyof typeof accordions) => {
    setAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const scrollToReviews = () => {
    setAccordions((prev) => ({ ...prev, reviews: true }));
    if (reviewsSectionRef.current) {
      reviewsSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // 8. Modals
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [reviewSubmittedToast, setReviewSubmittedToast] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "photos" | "5star">("all");

  // Sample Reviews
  const defaultReviews: ReviewItem[] = [
    {
      id: "rev-1",
      author: "Marcus K.",
      location: "Chicago, IL",
      rating: 5,
      date: "August 28, 2026",
      sizePurchased: "US 10",
      verified: true,
      title: "Best everyday runner I've owned in years",
      content:
        "The step-in comfort is immediate. The dual cushioning unit gives a smooth rocker transition on concrete streets. Construction quality and stitching are pristine.",
      helpfulCount: 24,
      fitFeedback: "True to Size",
      userPhotos: [
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=400&q=80",
      ],
    },
    {
      id: "rev-2",
      author: "Elena R.",
      location: "Seattle, WA",
      rating: 5,
      date: "August 15, 2026",
      sizePurchased: "US 8.5",
      verified: true,
      title: "Sleek silhouette, pairs with everything",
      content:
        "The monochrome off-white look is even cleaner in person. Super breathable upper during hot summer days. Will definitely be picking up the anthracite colorway next.",
      helpfulCount: 19,
      fitFeedback: "True to Size",
    },
    {
      id: "rev-3",
      author: "David V.",
      location: "Austin, TX",
      rating: 4,
      date: "July 30, 2026",
      sizePurchased: "US 11",
      verified: true,
      title: "Extremely comfortable, runs slightly snug at the toe",
      content:
        "Arch support is top notch and the outsole has fantastic grip in light rain. If you have wider feet I recommend going half a size up for a relaxed fit.",
      helpfulCount: 9,
      fitFeedback: "Runs Small",
      userPhotos: [
        "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=400&q=80",
      ],
    },
  ];

  const activeReviews = product.reviews && product.reviews.length > 0 ? product.reviews : defaultReviews;

  const filteredReviews = activeReviews.filter((r) => {
    if (reviewFilter === "photos") return r.userPhotos && r.userPhotos.length > 0;
    if (reviewFilter === "5star") return r.rating === 5;
    return true;
  });

  // Handle Real Add to Bag
  const handleAddToBag = async () => {
    // Check generic attributes requirement
    if (product.hasVariants !== false && product.attributes && product.attributes.length > 0) {
      for (const attr of product.attributes) {
        if (!selectedAttributes[attr.code]) {
          setAttributeError(`Please select your ${attr.name.toLowerCase()} to continue.`);
          return;
        }
      }
    } else if (availableSizes.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }

    if (!isVariantInStock) {
      setAttributeError("This configuration is currently out of stock.");
      return;
    }

    setAttributeError(null);
    setSizeError(false);
    setIsAddingToBag(true);

    try {
      const res = await addToCart(
        product.id,
        selectedVariant?.id || null,
        quantity
      );

      if (!res.success) {
        setAttributeError(res.error || "Unable to add to bag.");
      } else {
        setShowBagToast(true);
        setBagCount((prev) => prev + quantity);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection error. Please try again.";
      setAttributeError(msg);
    } finally {
      setIsAddingToBag(false);
    }
  };

  // Badge resolution
  const badgeType: ProductBadgeType =
    product.badgeType ||
    (product.isOnSale ? "extra-discount" : product.isFeatured ? "best-seller" : "sustainable");

  const badgeConfig = {
    "best-seller": { label: "Best Seller", colorClass: "text-[#D37918]" },
    "extra-discount": { label: "Extra 20% off", colorClass: "text-[#D33918]" },
    sustainable: { label: "Sustainable Materials", colorClass: "text-[#007D48]" },
    none: null,
  }[badgeType];

  return (
    <div className="bg-[#FFFFFF] min-h-screen text-[#111111]">
      {/* 
        ========================================================================
        BREADCRUMB HEADER
        ========================================================================
      */}
      <div className="border-b border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#757575] overflow-x-auto py-0.5"
          >
            {product.breadcrumbs && product.breadcrumbs.length > 0 ? (
              product.breadcrumbs.map((crumb, idx) => (
                <div key={crumb.label} className="flex items-center space-x-2 shrink-0">
                  {idx > 0 && <span>/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-[#111111] transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[#111111] font-bold truncate max-w-xs">
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <>
                <Link href="/" className="hover:text-[#111111] transition-colors">
                  Home
                </Link>
                <span>/</span>
                <Link href="/shop" className="hover:text-[#111111] transition-colors">
                  Catalog
                </Link>
                <span>/</span>
                {product.primaryCategory && (
                  <>
                    <Link
                      href={`/category/${product.primaryCategory.slug}`}
                      className="hover:text-[#111111] transition-colors"
                    >
                      {product.primaryCategory.name}
                    </Link>
                    <span>/</span>
                  </>
                )}
                <span className="text-[#111111] font-bold truncate max-w-xs">{product.title}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* 
        ========================================================================
        MAIN 2-COLUMN GRID (Left: Media Showcase | Right: Purchase Column)
        ========================================================================
      */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14 items-start">
          {/* 
            --------------------------------------------------------------------
            A. LEFT COLUMN: MEDIA GALLERY & SHOWCASE CANVAS
            --------------------------------------------------------------------
            - Main Product Viewer: Large high-resolution product showcase box over an off-white container (#F5F5F5)
            - Thumbnail Gallery Strip: Vertical thumbnail strip (desktop) or horizontal scrollable bar (mobile) featuring 4-6 product angles
            - Interactive Elements: Image zoom on hover, subtle pill badges on top-left, and subtle Wishlist Heart overlay on top-right
          */}
          <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4 lg:gap-5">
            {/* THUMBNAIL GALLERY STRIP (Vertical on Desktop, Horizontal on Mobile) */}
            <div
              className="flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto lg:w-20 shrink-0 pb-2 lg:pb-0 scrollbar-none"
              aria-label="Product Media Angles"
            >
              {activeImages.map((imgUrl, index) => {
                const isSelected = activeImageIndex === index;
                return (
                  <button
                    key={`${imgUrl}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    onMouseEnter={() => setActiveImageIndex(index)}
                    aria-label={`View product perspective ${index + 1}`}
                    className={`relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-[#F5F5F5] shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? "border-2 border-[#111111] shadow-xs"
                        : "border border-[#E5E5E5] opacity-75 hover:opacity-100 hover:border-[#757575]"
                    }`}
                  >
                    <Image
                      src={imgUrl}
                      alt={`${product.title} angle ${index + 1}`}
                      fill
                      sizes="80px"
                      referrerPolicy="no-referrer"
                      className="object-cover object-center"
                    />
                  </button>
                );
              })}
            </div>

            {/* MAIN PRODUCT SHOWCASE BOX */}
            <div className="relative flex-1">
              <div
                ref={showcaseRef}
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleMouseMove}
                className="relative aspect-square sm:aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#F5F5F5] border border-[#E5E5E5] cursor-crosshair select-none transition-colors"
              >
                {/* Showcase Image with High-Precision Cursor Tracking Zoom */}
                {activeImages[activeImageIndex] ? (
                  <div className="relative h-full w-full overflow-hidden">
                    <Image
                      src={activeImages[activeImageIndex]}
                      alt={`${product.title} showcase view`}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      referrerPolicy="no-referrer"
                      className={`h-full w-full object-cover object-center transition-transform duration-200 ease-out ${
                        isZooming ? "scale-175" : "scale-100"
                      }`}
                      style={
                        isZooming
                          ? {
                              transformOrigin: `${zoomCoords.x}% ${zoomCoords.y}%`,
                            }
                          : undefined
                      }
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#757575]">
                    <span>Product Imagery</span>
                  </div>
                )}

                {/* TOP-LEFT FLOATING PILL BADGE (#FFFFFF Pill with color accent) */}
                {badgeConfig && (
                  <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <span
                      className={`inline-flex items-center px-3.5 py-1 rounded-full bg-[#FFFFFF] ${badgeConfig.colorClass} text-xs font-semibold shadow-xs border border-[#E5E5E5]/60 tracking-tight`}
                    >
                      {badgeConfig.label}
                    </span>
                  </div>
                )}

                {/* TOP-RIGHT FLOATING ACTION: WISHLIST HEART OVERLAY */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWishlisted(!isWishlisted);
                  }}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFFFF] text-[#111111] shadow-xs border border-[#E5E5E5]/60 hover:bg-[#F5F5F5] hover:scale-105 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#111111]"
                >
                  <Heart
                    className={`h-5 w-5 transition-colors ${
                      isWishlisted ? "fill-[#D33918] text-[#D33918]" : "text-[#111111]"
                    }`}
                  />
                </button>

                {/* BOTTOM-RIGHT PERSPECTIVE COUNTER */}
                <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
                  <span className="rounded-full bg-[#FFFFFF]/90 backdrop-blur-xs px-3 py-1 text-[11px] font-bold text-[#757575] border border-[#E5E5E5]/60 shadow-2xs">
                    {activeImageIndex + 1} / {activeImages.length}
                  </span>
                </div>
              </div>

              {/* Mobile Zoom Notice */}
              <p className="mt-2 text-center text-[11px] text-[#757575] lg:hidden">
                Tap or pinch image to inspect details
              </p>
            </div>
          </div>

          {/* 
            --------------------------------------------------------------------
            B. RIGHT COLUMN: PRODUCT INFORMATION & PURCHASE COLUMN (STICKY)
            --------------------------------------------------------------------
          */}
          <div
            ref={purchaseBoxRef}
            className="lg:col-span-5 lg:sticky lg:top-28 space-y-6 pt-1 lg:pt-0"
          >
            {/* 1. Category / Sub-header */}
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#757575]">
                {product.customCategoryTag ||
                  (product.primaryCategory?.name
                    ? `${product.primaryCategory.name} / Performance`
                    : "Men's Footwear / Atelier")}
              </span>

              {/* 2. Title & Price Header */}
              <div className="flex items-baseline justify-between gap-4 pt-1">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111] leading-tight">
                    {product.title}
                  </h1>
                  {effectiveSku && (
                    <p className="text-[11px] text-[#757575] font-mono mt-0.5">
                      Style: {effectiveSku}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl sm:text-2xl font-bold text-[#111111]">
                    {siteConfig.currency.symbol}
                    {effectivePrice.toFixed(2)}
                  </span>
                  {effectiveCompareAt && effectiveCompareAt > effectivePrice && (
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-xs text-[#757575] line-through">
                        {siteConfig.currency.symbol}
                        {effectiveCompareAt.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-[#D33918]">
                        Save {Math.round(((effectiveCompareAt - effectivePrice) / effectiveCompareAt) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Reviews Summary (Star Icons + Count Link) */}
              <div className="flex items-center gap-2 pt-2">
                <div className="flex items-center text-[#111111]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#111111] text-[#111111]" />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#111111]">4.9</span>
                <button
                  type="button"
                  onClick={scrollToReviews}
                  className="text-xs font-semibold text-[#757575] hover:text-[#111111] underline underline-offset-2 cursor-pointer transition-colors"
                >
                  (128 Reviews)
                </button>
              </div>
            </div>

            {/* Short Editorial Description */}
            <p className="text-xs sm:text-sm text-[#757575] font-normal leading-relaxed">
              {product.shortDescription ||
                product.description ||
                "Engineered for fluid daily transitions and superior all-day cushioning. Built with clean lines, responsive underfoot foam, and a lightweight breathable upper."}
            </p>

            <div className="h-px bg-[#E5E5E5]" />

            {/* GENERIC VARIANT ATTRIBUTE SELECTORS */}
            {product.hasVariants !== false && product.attributes && product.attributes.length > 0 ? (
              <div className="space-y-5">
                {product.attributes.map((attr) => {
                  const isColor = attr.type === "color_swatch" || attr.code.toLowerCase().includes("color");
                  const isSelect = attr.type === "select";
                  const selectedVal = selectedAttributes[attr.code];

                  return (
                    <div key={attr.code} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                          Select {attr.name}
                        </label>
                        <div className="flex items-center gap-3">
                          {selectedVal && (
                            <span className="text-xs font-semibold text-[#757575] capitalize">
                              Selected: <strong className="text-[#111111]">{selectedVal}</strong>
                            </span>
                          )}
                          {attr.code.toLowerCase().includes("size") && (
                            <button
                              type="button"
                              onClick={() => setIsSizeGuideOpen(true)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#757575] hover:text-[#111111] underline underline-offset-4 cursor-pointer transition-colors"
                            >
                              <Ruler className="h-3 w-3" />
                              <span>Guide</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {isColor ? (
                        /* Color Swatch Thumbnails */
                        <div className="flex flex-wrap gap-2.5">
                          {attr.options.map((opt) => {
                            const isSelected = selectedVal?.toLowerCase() === opt.value.toLowerCase();
                            // Check if combination is available
                            const matchingVars = (product.variants || []).filter(
                              (v) => v.attributes[attr.code]?.toLowerCase() === opt.value.toLowerCase()
                            );
                            const inStock = matchingVars.some((v) => v.inStock);

                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setSelectedAttributes((prev) => ({
                                    ...prev,
                                    [attr.code]: opt.value,
                                  }));
                                  setAttributeError(null);
                                }}
                                className={`relative h-12 w-12 rounded-xl overflow-hidden p-1 transition-all cursor-pointer flex items-center justify-center ${
                                  isSelected
                                    ? "ring-2 ring-[#111111] ring-offset-2 border-transparent"
                                    : "border border-[#E5E5E5] hover:border-[#757575]"
                                } ${!inStock ? "opacity-40" : ""}`}
                                title={`${opt.label}${!inStock ? " (Out of stock)" : ""}`}
                              >
                                <div
                                  className="w-full h-full rounded-lg border border-neutral-200/40"
                                  style={{ backgroundColor: opt.colorHex || "#333333" }}
                                />
                                {!inStock && (
                                  <div
                                    aria-hidden="true"
                                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                                  >
                                    <div className="w-[120%] h-[1.5px] bg-[#AAAAAA] rotate-[-25deg]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : isSelect ? (
                        <select
                          value={selectedVal || ""}
                          onChange={(e) => {
                            setSelectedAttributes((prev) => ({
                              ...prev,
                              [attr.code]: e.target.value,
                            }));
                            setAttributeError(null);
                          }}
                          className="w-full h-12 px-3.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
                        >
                          <option value="" disabled>
                            Choose {attr.name}
                          </option>
                          {attr.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        /* Button Pill Grid */
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {attr.options.map((opt) => {
                            const isSelected = selectedVal?.toLowerCase() === opt.value.toLowerCase();
                            // Check variant availability for this option given other chosen attributes
                            const partiallyMatched = (product.variants || []).filter((v) => {
                              if (v.attributes[attr.code]?.toLowerCase() !== opt.value.toLowerCase()) return false;
                              for (const [otherCode, otherVal] of Object.entries(selectedAttributes)) {
                                if (otherCode === attr.code) continue;
                                if (v.attributes[otherCode]?.toLowerCase() !== otherVal?.toLowerCase()) return false;
                              }
                              return true;
                            });

                            const hasAnyInStock = partiallyMatched.length > 0
                              ? partiallyMatched.some((v) => v.inStock)
                              : (product.variants || [])
                                  .filter((v) => v.attributes[attr.code]?.toLowerCase() === opt.value.toLowerCase())
                                  .some((v) => v.inStock);

                            const isUnavailable = !hasAnyInStock;

                            return (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={isUnavailable}
                                onClick={() => {
                                  setSelectedAttributes((prev) => ({
                                    ...prev,
                                    [attr.code]: opt.value,
                                  }));
                                  setAttributeError(null);
                                }}
                                className={`relative h-12 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                  isUnavailable
                                    ? "bg-[#F5F5F5] text-[#AAAAAA] border border-[#E5E5E5] cursor-not-allowed overflow-hidden"
                                    : isSelected
                                    ? "bg-[#111111] text-[#FFFFFF] border-2 border-[#111111] shadow-xs"
                                    : "bg-[#FFFFFF] text-[#111111] border border-[#E5E5E5] hover:border-[#111111]"
                                }`}
                              >
                                <span>{opt.label}</span>
                                {isUnavailable && (
                                  <div
                                    aria-hidden="true"
                                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                                  >
                                    <div className="w-[120%] h-[1.5px] bg-[#AAAAAA] rotate-[-25deg]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback for catalog products without generic attributes */
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Select Color
                    </label>
                    <span className="text-xs font-semibold text-[#757575]">
                      {defaultColorways.length} Colours Available
                    </span>
                  </div>
                  <p className="text-xs text-[#757575] font-medium">
                    Shown: <span className="text-[#111111] font-bold">{selectedColorway.name}</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {defaultColorways.map((cw) => {
                      const isSelected = selectedColorway.id === cw.id;
                      return (
                        <button
                          key={cw.id}
                          type="button"
                          onClick={() => {
                            setSelectedColorway(cw);
                            setActiveImageIndex(0);
                          }}
                          className={`relative h-14 w-14 rounded-xl overflow-hidden bg-[#F5F5F5] transition-all cursor-pointer group ${
                            isSelected
                              ? "ring-2 ring-[#111111] ring-offset-2 border-transparent"
                              : "border border-[#E5E5E5] hover:border-[#757575]"
                          }`}
                          title={cw.name}
                        >
                          <Image
                            src={cw.thumbnailUrl}
                            alt={cw.name}
                            fill
                            sizes="56px"
                            referrerPolicy="no-referrer"
                            className="object-cover object-center group-hover:scale-105 transition-transform"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Select Size
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#757575] hover:text-[#111111] underline underline-offset-4 cursor-pointer transition-colors"
                    >
                      <Ruler className="h-3.5 w-3.5" />
                      <span>Size Guide</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSizes.map((item) => {
                      const isSelected = selectedSize === item.size;
                      const isOutOfStock = !item.inStock;
                      return (
                        <button
                          key={item.size}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => {
                            setSelectedSize(item.size);
                            setSizeError(false);
                          }}
                          className={`relative h-12 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            isOutOfStock
                              ? "bg-[#F5F5F5] text-[#AAAAAA] border border-[#E5E5E5] cursor-not-allowed overflow-hidden"
                              : isSelected
                              ? "bg-[#111111] text-[#FFFFFF] border-2 border-[#111111] shadow-xs"
                              : "bg-[#FFFFFF] text-[#111111] border border-[#E5E5E5] hover:border-[#111111]"
                          }`}
                        >
                          <span>{item.size}</span>
                          {isOutOfStock && (
                            <div
                              aria-hidden="true"
                              className="absolute inset-0 pointer-events-none flex items-center justify-center"
                            >
                              <div className="w-[120%] h-[1.5px] bg-[#AAAAAA] rotate-[-25deg]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Quantity Stepper & Stock Warnings */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Quantity
                </span>
                <div className="flex items-center border border-[#E5E5E5] rounded-full bg-[#FFFFFF]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isAddingToBag}
                    className="p-2 text-[#757575] hover:text-[#111111] disabled:opacity-30 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-3 text-xs font-bold text-[#111111] min-w-[28px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(Math.min(10, maxAvailableStock), q + 1))
                    }
                    disabled={quantity >= Math.min(10, maxAvailableStock) || isAddingToBag}
                    className="p-2 text-[#757575] hover:text-[#111111] disabled:opacity-30 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Stock Status Pill */}
              <div>
                {!isVariantInStock ? (
                  <span className="text-xs font-bold text-[#D33918]">Out of Stock</span>
                ) : isLowStock ? (
                  <span className="text-xs font-semibold text-[#D37918]">
                    Only {maxAvailableStock} units remaining
                  </span>
                ) : (
                  <span className="text-xs font-medium text-[#007D48]">In Stock</span>
                )}
              </div>
            </div>

            {/* Validation Warning Messages */}
            {(attributeError || sizeError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-[#D33918] flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{attributeError || "Please select a size to continue."}</span>
              </div>
            )}

            {/* 6. CTA Action Block */}
            <div className="space-y-3 pt-2">
              {/* Primary "Add to Bag" Button (#111111 background, #FFFFFF text, rounded-full) */}
              <button
                type="button"
                onClick={handleAddToBag}
                disabled={isAddingToBag || isMutating || !isVariantInStock}
                className={`w-full h-14 rounded-full text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  !isVariantInStock
                    ? "bg-[#E5E5E5] text-[#757575] cursor-not-allowed"
                    : "bg-[#111111] text-[#FFFFFF] hover:bg-[#262626] active:scale-[0.99] disabled:opacity-75"
                }`}
              >
                {isAddingToBag || isMutating ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-[#FFFFFF] border-t-transparent animate-spin" />
                    <span>Adding to Bag...</span>
                  </div>
                ) : !isVariantInStock ? (
                  <span>Sold Out</span>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Add to Bag</span>
                  </>
                )}
              </button>

              {/* Secondary "Favorite / Wishlist" Button (Outlined rounded-full button with Heart icon) */}
              <button
                type="button"
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`w-full h-14 rounded-full border border-[#E5E5E5] bg-[#FFFFFF] text-sm font-bold text-[#111111] hover:border-[#111111] hover:bg-[#F5F5F5] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isWishlisted ? "border-[#111111]" : ""
                }`}
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    isWishlisted ? "fill-[#D33918] text-[#D33918]" : "text-[#111111]"
                  }`}
                />
                <span>{isWishlisted ? "Saved to Favorites" : "Favorite"}</span>
              </button>
            </div>

            {/* Quick Benefits Guarantee Strip */}
            <div className="rounded-xl border border-[#E5E5E5] p-4 bg-[#F5F5F5]/60 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-[#111111] font-semibold">
                <Truck className="h-4 w-4 text-[#111111] shrink-0" />
                <span>Free standard shipping for Atelier Members</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#111111] font-semibold">
                <RotateCcw className="h-4 w-4 text-[#111111] shrink-0" />
                <span>Complimentary 60-day return window</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#111111] font-semibold">
                <ShieldCheck className="h-4 w-4 text-[#111111] shrink-0" />
                <span>100% Guaranteed authentic & verified atelier craft</span>
              </div>
            </div>
          </div>
        </div>

        {/* 
          ----------------------------------------------------------------------
          C. LOWER ACCORDION SECTIONS (NIKE STYLE)
          ----------------------------------------------------------------------
          - Free Shipping & Delivery
          - Product Details & Specs
          - Reviews & Ratings
        */}
        <div className="mt-16 sm:mt-24 border-t border-[#E5E5E5] max-w-4xl mx-auto">
          {/* ACCORDION 1: FREE SHIPPING & DELIVERY */}
          <div className="border-b border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => toggleAccordion("shipping")}
              className="w-full flex items-center justify-between py-6 text-left cursor-pointer group"
              aria-expanded={accordions.shipping}
            >
              <span className="text-base sm:text-lg font-black uppercase tracking-tight text-[#111111] group-hover:text-[#757575] transition-colors">
                Free Shipping & Delivery
              </span>
              {accordions.shipping ? (
                <ChevronUp className="h-5 w-5 text-[#111111]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[#111111]" />
              )}
            </button>

            {accordions.shipping && (
              <div className="pb-8 space-y-4 text-xs sm:text-sm text-[#757575] leading-relaxed animate-in fade-in-50 duration-200">
                <p>
                  Atelier Members receive complimentary standard shipping on all purchases of $50
                  or more. Orders placed by 2:00 PM EST ship same business day.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="rounded-xl border border-[#E5E5E5] p-4 bg-[#F5F5F5]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1">
                      Standard Shipping
                    </h4>
                    <p className="text-xs text-[#757575]">
                      Arrives in 2–4 business days. Free for members or $6.95.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E5E5E5] p-4 bg-[#F5F5F5]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1">
                      Next-Day Air
                    </h4>
                    <p className="text-xs text-[#757575]">
                      Guaranteed delivery next afternoon. $19.95 flat rate.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E5E5E5] p-4 bg-[#F5F5F5]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1">
                      60-Day Returns
                    </h4>
                    <p className="text-xs text-[#757575]">
                      Wear it, test it, love it or return it within 60 days hassle-free.
                    </p>
                  </div>
                </div>

                <p className="pt-2 text-xs text-[#757575]">
                  Need in-store pickup? Select &quot;Store Pick-up&quot; during checkout to collect your order
                  at an Atelier flagship store within 2 hours.
                </p>
              </div>
            )}
          </div>

          {/* ACCORDION 2: PRODUCT DETAILS & SPECS */}
          <div className="border-b border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => toggleAccordion("specs")}
              className="w-full flex items-center justify-between py-6 text-left cursor-pointer group"
              aria-expanded={accordions.specs}
            >
              <span className="text-base sm:text-lg font-black uppercase tracking-tight text-[#111111] group-hover:text-[#757575] transition-colors">
                Product Details & Specs
              </span>
              {accordions.specs ? (
                <ChevronUp className="h-5 w-5 text-[#111111]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[#111111]" />
              )}
            </button>

            {accordions.specs && (
              <div className="pb-8 space-y-6 text-xs sm:text-sm text-[#757575] leading-relaxed animate-in fade-in-50 duration-200">
                <p>
                  {product.description ||
                    "Point-loaded cushioning with responsive foam midsoles delivers dynamic energy return. Engineered with breathable textile mesh and reinforced synthetic mudguards for enhanced longevity across high-abrasion zones."}
                </p>

                {/* Specs Table */}
                <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
                  <div className="divide-y divide-[#E5E5E5]">
                    <div className="grid grid-cols-3 p-3 text-xs bg-[#F5F5F5]/60">
                      <span className="font-bold text-[#111111]">Style Code / SKU</span>
                      <span className="col-span-2 text-[#757575] font-mono">
                        {effectiveSku || product.modelCode || product.styleCode || "HF4281-100"}
                      </span>
                    </div>
                    {product.specifications && product.specifications.length > 0 ? (
                      product.specifications.map((spec, i) => (
                        <div
                          key={spec.label}
                          className={`grid grid-cols-3 p-3 text-xs ${i % 2 === 0 ? "" : "bg-[#F5F5F5]/60"}`}
                        >
                          <span className="font-bold text-[#111111]">{spec.label}</span>
                          <span className="col-span-2 text-[#757575]">{spec.value}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="grid grid-cols-3 p-3 text-xs">
                          <span className="font-bold text-[#111111]">Upper Materials</span>
                          <span className="col-span-2 text-[#757575]">
                            Multi-density ballistic mesh, synthetic overlays, reinforced eyelets
                          </span>
                        </div>
                        <div className="grid grid-cols-3 p-3 text-xs bg-[#F5F5F5]/60">
                          <span className="font-bold text-[#111111]">Midsole / Foam</span>
                          <span className="col-span-2 text-[#757575]">
                            Dual-density responsive foam with heel air cushioning chamber
                          </span>
                        </div>
                        <div className="grid grid-cols-3 p-3 text-xs">
                          <span className="font-bold text-[#111111]">Outsole</span>
                          <span className="col-span-2 text-[#757575]">
                            Waffle-pattern carbon rubber with flex articulation grooves
                          </span>
                        </div>
                        <div className="grid grid-cols-3 p-3 text-xs bg-[#F5F5F5]/60">
                          <span className="font-bold text-[#111111]">Country of Origin</span>
                          <span className="col-span-2 text-[#757575]">
                            Designed in Atelier Innovation Lab, Assembled in Vietnam
                          </span>
                        </div>
                        <div className="grid grid-cols-3 p-3 text-xs">
                          <span className="font-bold text-[#111111]">Care Instructions</span>
                          <span className="col-span-2 text-[#757575]">
                            Spot clean with soft brush and mild soap. Air dry away from heat sources.
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 3: REVIEWS & RATINGS */}
          <div ref={reviewsSectionRef} className="border-b border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => toggleAccordion("reviews")}
              className="w-full flex items-center justify-between py-6 text-left cursor-pointer group"
              aria-expanded={accordions.reviews}
            >
              <div className="flex items-center gap-3">
                <span className="text-base sm:text-lg font-black uppercase tracking-tight text-[#111111] group-hover:text-[#757575] transition-colors">
                  Reviews (128)
                </span>
                <div className="flex items-center text-[#111111]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#111111] text-[#111111]" />
                  ))}
                </div>
              </div>
              {accordions.reviews ? (
                <ChevronUp className="h-5 w-5 text-[#111111]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[#111111]" />
              )}
            </button>

            {accordions.reviews && (
              <div className="pb-10 space-y-8 animate-in fade-in-50 duration-200">
                {/* Ratings Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center rounded-2xl border border-[#E5E5E5] p-6 sm:p-8 bg-[#F5F5F5]/50">
                  {/* Left: Overall Score */}
                  <div className="md:col-span-4 text-center md:text-left border-b md:border-b-0 md:border-r border-[#E5E5E5] pb-6 md:pb-0 md:pr-6">
                    <div className="text-5xl font-black text-[#111111] tracking-tight">4.9</div>
                    <div className="flex items-center justify-center md:justify-start gap-1 text-[#111111] my-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-[#111111] text-[#111111]" />
                      ))}
                    </div>
                    <p className="text-xs text-[#757575] font-semibold">
                      97% of buyers recommend this product
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsWriteReviewOpen(true)}
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-[#111111] px-5 py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#262626] transition-colors cursor-pointer"
                    >
                      Write a Review
                    </button>
                  </div>

                  {/* Center: Rating Distribution Bars */}
                  <div className="md:col-span-4 space-y-2">
                    {[
                      { star: 5, pct: 86, count: 110 },
                      { star: 4, pct: 10, count: 12 },
                      { star: 3, pct: 3, count: 4 },
                      { star: 2, pct: 1, count: 2 },
                      { star: 1, pct: 0, count: 0 },
                    ].map((row) => (
                      <div key={row.star} className="flex items-center gap-2 text-xs">
                        <span className="w-12 font-bold text-[#111111]">{row.star} Stars</span>
                        <div className="flex-1 h-2 rounded-full bg-[#E5E5E5] overflow-hidden">
                          <div
                            className="h-full bg-[#111111] rounded-full transition-all duration-500"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-medium text-[#757575]">
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Right: Fit & Comfort Feedback */}
                  <div className="md:col-span-4 space-y-4 border-t md:border-t-0 md:border-l border-[#E5E5E5] pt-6 md:pt-0 md:pl-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-[#111111] mb-1">
                        <span>Size Fit</span>
                        <span className="text-[#007D48]">Runs True to Size (89%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#E5E5E5] overflow-hidden">
                        <div className="h-full bg-[#111111] w-[89%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-[#111111] mb-1">
                        <span>Comfort</span>
                        <span className="text-[#007D48]">Very Comfortable (95%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#E5E5E5] overflow-hidden">
                        <div className="h-full bg-[#111111] w-[95%]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs for Customer Reviews */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewFilter("all")}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        reviewFilter === "all"
                          ? "bg-[#111111] text-[#FFFFFF]"
                          : "bg-[#F5F5F5] text-[#111111] hover:bg-[#E5E5E5]"
                      }`}
                    >
                      All Reviews ({activeReviews.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter("photos")}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        reviewFilter === "photos"
                          ? "bg-[#111111] text-[#FFFFFF]"
                          : "bg-[#F5F5F5] text-[#111111] hover:bg-[#E5E5E5]"
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>With Photos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter("5star")}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        reviewFilter === "5star"
                          ? "bg-[#111111] text-[#FFFFFF]"
                          : "bg-[#F5F5F5] text-[#111111] hover:bg-[#E5E5E5]"
                      }`}
                    >
                      5 Stars Only
                    </button>
                  </div>

                  <span className="text-xs text-[#757575]">
                    Showing {filteredReviews.length} of {activeReviews.length} reviews
                  </span>
                </div>

                {/* Customer Reviews List */}
                <div className="space-y-6 divide-y divide-[#E5E5E5]">
                  {filteredReviews.map((rev) => (
                    <div key={rev.id} className="pt-6 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center text-[#111111]">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < rev.rating
                                      ? "fill-[#111111] text-[#111111]"
                                      : "text-[#E5E5E5]"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-[#111111]">{rev.title}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[#757575] mt-1">
                            <span className="font-semibold text-[#111111]">{rev.author}</span>
                            <span>•</span>
                            <span>{rev.location}</span>
                            <span>•</span>
                            <span>{rev.date}</span>
                            {rev.verified && (
                              <span className="inline-flex items-center gap-1 text-[#007D48] font-bold">
                                <Check className="h-3 w-3" />
                                <span>Verified Buyer</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] font-medium text-[#757575] bg-[#F5F5F5] px-2.5 py-1 rounded-md border border-[#E5E5E5]">
                          Size: {rev.sizePurchased}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-[#757575] leading-relaxed">
                        {rev.content}
                      </p>

                      {/* Reviewer Uploaded Photos */}
                      {rev.userPhotos && rev.userPhotos.length > 0 && (
                        <div className="flex items-center gap-3 pt-1">
                          {rev.userPhotos.map((photo, pIdx) => (
                            <div
                              key={pIdx}
                              className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-[#F5F5F5] border border-[#E5E5E5]"
                            >
                              <Image
                                src={photo}
                                alt={`Customer photo ${pIdx + 1}`}
                                fill
                                sizes="80px"
                                referrerPolicy="no-referrer"
                                className="object-cover object-center hover:scale-105 transition-transform"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-[#757575] pt-1">
                        <span className="text-[11px]">
                          Fit: <strong className="text-[#111111]">{rev.fitFeedback}</strong>
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 hover:text-[#111111] transition-colors cursor-pointer text-[11px]"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          <span>Helpful ({rev.helpfulCount})</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 
          ----------------------------------------------------------------------
          D. RECOMMENDED PRODUCTS SECTION: "YOU MIGHT ALSO LIKE"
          ----------------------------------------------------------------------
          - 4 product cards using our exact Nike-style card layout (#F5F5F5 image box, badges, title, price, variant count)
        */}
        {recommendedProducts && recommendedProducts.length > 0 && (
          <section className="mt-20 sm:mt-28 border-t border-[#E5E5E5] pt-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
                  You Might Also Like
                </h2>
                <p className="text-xs sm:text-sm text-[#757575] mt-1">
                  Complementary silhouettes engineered with the same craft and responsive comfort.
                </p>
              </div>
              <Link
                href="/shop"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#111111] hover:text-[#757575] underline underline-offset-4"
              >
                View Full Catalog
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {recommendedProducts.slice(0, 4).map((recProduct) => (
                <ProductCard key={recProduct.id} product={recProduct} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 
        ========================================================================
        STICKY MOBILE BOTTOM CTA BAR
        ========================================================================
        - Visible when user scrolls past main purchase box on mobile
      */}
      {showMobileStickyBar && (
        <aside
          aria-label="Quick Purchase Bar"
          className="fixed bottom-0 inset-x-0 bg-[#FFFFFF] border-t border-[#E5E5E5] p-3 z-40 lg:hidden shadow-lg animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-[#F5F5F5] border border-[#E5E5E5] shrink-0">
                <Image
                  src={activeImages[0]}
                  alt={product.title}
                  fill
                  sizes="44px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-[#111111] truncate">{product.title}</h4>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#111111]">
                    {siteConfig.currency.symbol}
                    {effectivePrice.toFixed(2)}
                  </span>
                  {selectedVariant?.title && (
                    <span className="text-[10px] font-bold text-[#757575] bg-[#F5F5F5] px-1.5 py-0.5 rounded-sm">
                      {selectedVariant.title}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToBag}
              disabled={isAddingToBag || isMutating || !isVariantInStock}
              className={`h-11 px-5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm ${
                !isVariantInStock
                  ? "bg-[#E5E5E5] text-[#757575] cursor-not-allowed"
                  : "bg-[#111111] text-[#FFFFFF] hover:bg-[#262626]"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>
                {!isVariantInStock ? "Sold Out" : isAddingToBag ? "Adding..." : "Add to Bag"}
              </span>
            </button>
          </div>
        </aside>
      )}

      {/* 
        ========================================================================
        ADDED TO BAG NOTIFICATION MODAL / TOAST
        ========================================================================
      */}
      {showBagToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-[#FFFFFF] p-6 shadow-2xl border border-[#E5E5E5] animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowBagToast(false)}
              className="absolute top-4 right-4 text-[#757575] hover:text-[#111111] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-[#007D48] text-xs font-bold uppercase tracking-wider mb-4">
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Added to Your Bag</span>
            </div>

            <div className="flex gap-4 items-center pb-5 border-b border-[#E5E5E5]">
              <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-[#F5F5F5] border border-[#E5E5E5] shrink-0">
                <Image
                  src={activeImages[0]}
                  alt={product.title}
                  fill
                  sizes="80px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <div className="space-y-1 truncate">
                <h3 className="text-sm font-bold text-[#111111] truncate">{product.title}</h3>
                <p className="text-xs text-[#757575] truncate">
                  {selectedVariant?.title || selectedColorway.name}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-[#111111]">Qty: {quantity}</span>
                  <span>•</span>
                  <span className="font-bold text-[#111111]">
                    {siteConfig.currency.symbol}
                    {(effectivePrice * quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-5 space-y-3">
              <Link
                href="/cart"
                className="w-full h-12 rounded-full bg-[#111111] text-[#FFFFFF] text-xs font-bold uppercase tracking-wider hover:bg-[#262626] transition-colors flex items-center justify-center gap-2"
              >
                <span>View Bag & Checkout</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowBagToast(false)}
                className="w-full h-12 rounded-full border border-[#E5E5E5] bg-[#FFFFFF] text-xs font-bold text-[#111111] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              >
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        SIZE GUIDE MODAL
        ========================================================================
      */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#FFFFFF] p-6 sm:p-8 shadow-2xl border border-[#E5E5E5] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(false)}
              className="absolute top-5 right-5 text-[#757575] hover:text-[#111111] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight text-[#111111]">
                {isApparel ? "Apparel Size Chart" : "Footwear Size & Fit Guide"}
              </h3>
              <p className="text-xs text-[#757575]">
                Standard sizing conversion with barefoot foot-length measurements.
              </p>
            </div>

            {/* Sizing Table */}
            <div className="rounded-xl border border-[#E5E5E5] overflow-hidden mb-6">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F5F5F5] text-[#111111] font-bold border-b border-[#E5E5E5]">
                  <tr>
                    <th className="p-3">US Size</th>
                    <th className="p-3">UK</th>
                    <th className="p-3">EUR</th>
                    <th className="p-3">Inches</th>
                    <th className="p-3">CM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] text-[#757575]">
                  {[
                    { us: "7.0", uk: "6.0", eur: "40.0", in: "9.8", cm: "25.0" },
                    { us: "7.5", uk: "6.5", eur: "40.5", in: "10.0", cm: "25.5" },
                    { us: "8.0", uk: "7.0", eur: "41.0", in: "10.2", cm: "26.0" },
                    { us: "8.5", uk: "7.5", eur: "42.0", in: "10.4", cm: "26.5" },
                    { us: "9.0", uk: "8.0", eur: "42.5", in: "10.6", cm: "27.0" },
                    { us: "9.5", uk: "8.5", eur: "43.0", in: "10.8", cm: "27.5" },
                    { us: "10.0", uk: "9.0", eur: "44.0", in: "11.0", cm: "28.0" },
                    { us: "10.5", uk: "9.5", eur: "44.5", in: "11.2", cm: "28.5" },
                    { us: "11.0", uk: "10.0", eur: "45.0", in: "11.4", cm: "29.0" },
                    { us: "12.0", uk: "11.0", eur: "46.0", in: "11.8", cm: "30.0" },
                  ].map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F5F5F5]/40"}>
                      <td className="p-3 font-bold text-[#111111]">{row.us}</td>
                      <td className="p-3">{row.uk}</td>
                      <td className="p-3">{row.eur}</td>
                      <td className="p-3">{row.in}&quot;</td>
                      <td className="p-3">{row.cm} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* How to Measure Instructions */}
            <div className="rounded-xl bg-[#F5F5F5] p-4 border border-[#E5E5E5] space-y-2 text-xs text-[#757575]">
              <h4 className="font-bold text-[#111111] uppercase tracking-wider">
                How to Measure Your Foot
              </h4>
              <p>
                1. Stand on a flat surface with your heel against a straight wall or edge.
              </p>
              <p>
                2. Place a ruler flat on the floor beside your foot from the wall to your longest toe.
              </p>
              <p>
                3. Note the measurement in centimeters and match it to our chart above for an optimal fit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        WRITE A REVIEW MODAL
        ========================================================================
      */}
      {isWriteReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#FFFFFF] p-6 sm:p-8 shadow-2xl border border-[#E5E5E5] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsWriteReviewOpen(false)}
              className="absolute top-5 right-5 text-[#757575] hover:text-[#111111] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight text-[#111111]">
                Write a Review
              </h3>
              <p className="text-xs text-[#757575]">
                Share your authentic experience with the Atelier community.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsWriteReviewOpen(false);
                setReviewSubmittedToast(true);
                setTimeout(() => setReviewSubmittedToast(false), 4000);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                  Overall Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="text-[#111111] hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className="h-6 w-6 fill-[#111111] text-[#111111]" />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-[#111111]">5 / 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                  Review Headline
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Incredibly comfortable daily shoe"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E5E5E5] text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                  Review Details
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="What did you think of the fit, cushioning, materials, and durability?"
                  className="w-full p-3.5 rounded-xl border border-[#E5E5E5] text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                    Your Name / Nickname
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Marcus K."
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E5E5E5] text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                    Size Purchased
                  </label>
                  <input
                    type="text"
                    placeholder="US 10.0"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E5E5E5] text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-full bg-[#111111] text-[#FFFFFF] text-xs font-bold uppercase tracking-wider hover:bg-[#262626] transition-colors cursor-pointer"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Review Submitted Toast */}
      {reviewSubmittedToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-[#111111] text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 border border-neutral-700 animate-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Thank you! Your verified review has been submitted for moderation.</span>
        </div>
      )}
    </div>
  );
}
