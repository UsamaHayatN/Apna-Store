import { StorefrontProduct } from "@/lib/storefront/storefront-service";

export type ProductBadgeType = "best-seller" | "extra-discount" | "sustainable" | "none";

export interface EnrichedPLPProduct extends StorefrontProduct {
  gender?: "men" | "women" | "unisex";
  isKids?: boolean;
  kidsCategory?: "boys" | "girls";
  height?: "low-top" | "mid-top" | "high-top";
  sport?: "lifestyle" | "skateboarding" | "dance" | "training" | "running" | "outerwear";
  badgeType?: ProductBadgeType;
  customCategoryTag?: string;
  customColorCount?: string;
  isCustomizable?: boolean;
}

export const DEFAULT_PLP_CATALOG: EnrichedPLPProduct[] = [
  {
    id: "prod-oxford-001",
    title: "The Benchcraft Wholecut Oxford",
    slug: "the-benchcraft-wholecut-oxford",
    brand: "Atelier Artisans",
    modelCode: "OXF-001",
    shortDescription: "Handcrafted Goodyear-welted French calfskin dress shoe.",
    description: "Traditional English benchcraft with oak bark leather outsole.",
    basePrice: 295.0,
    compareAtPrice: 350.0,
    status: "active",
    isFeatured: true,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    variantCount: 5,
    gender: "men",
    badgeType: "best-seller",
    customCategoryTag: "Men's Formal",
    customColorCount: "2 Colours",
    primaryCategory: { id: "cat-formal-shoes", name: "Formal Shoes", slug: "formal-shoes" },
    media: [
      {
        id: "m-oxf-01",
        url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80",
        altText: "The Benchcraft Wholecut Oxford",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "prod-boot-002",
    title: "Handcrafted Heritage Chelsea Boot",
    slug: "handcrafted-heritage-chelsea-boot",
    brand: "Atelier Artisans",
    modelCode: "CHL-002",
    shortDescription: "Italian calfskin Chelsea boot with Goodyear welt construction.",
    description: "Cut from full-grain calfskin with supple glove leather lining.",
    basePrice: 380.0,
    compareAtPrice: null,
    status: "active",
    isFeatured: true,
    isNewArrival: true,
    isOnSale: false,
    hasVariants: true,
    variantCount: 4,
    gender: "men",
    badgeType: "best-seller",
    customCategoryTag: "Men's Boots",
    customColorCount: "2 Colours",
    primaryCategory: { id: "cat-boots", name: "Boots", slug: "boots" },
    media: [
      {
        id: "m-chl-01",
        url: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80",
        altText: "Handcrafted Heritage Chelsea Boot",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "prod-sneaker-003",
    title: "Minimalist Italian Leather Sneaker",
    slug: "minimalist-italian-leather-sneaker",
    brand: "Atelier Studio",
    modelCode: "SNK-003",
    shortDescription: "Understated low-top sneaker in monochrome white nappa.",
    description: "Margom rubber cupsole with memory foam insole.",
    basePrice: 210.0,
    compareAtPrice: 240.0,
    status: "active",
    isFeatured: true,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    variantCount: 3,
    gender: "unisex",
    height: "low-top",
    sport: "lifestyle",
    badgeType: "extra-discount",
    customCategoryTag: "Unisex Sneakers",
    customColorCount: "2 Colours",
    primaryCategory: { id: "cat-sneakers", name: "Sneakers", slug: "sneakers" },
    media: [
      {
        id: "m-snk-01",
        url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
        altText: "Minimalist Italian Leather Sneaker",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
];
