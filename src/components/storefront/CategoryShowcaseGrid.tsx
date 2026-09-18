"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryCard, CategoryCardData } from "./CategoryCard";

/* 
  EXACT CATEGORY GRID SECTION DECODING:
  - Layout: Modular 3-4 column grid layout (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4)
  - Non-shoe / lifestyle categories: "Clothing", "Accessories", "Equipment"
  - Card styling: Clean #F5F5F5 (Light-200) image container background, subtle zoom effect on hover, bottom-left bold title text
  - Color System:
    * #111111 (Dark-900) for primary text and titles
    * #757575 (Dark-700) for descriptions and subtitles
    * #E5E5E5 (Light-300) for borders and dividers
    * #FFFFFF (Light-100) for card canvas
*/

interface CategoryShowcaseGridProps {
  categories?: CategoryCardData[];
}

const DEFAULT_LIFESTYLE_CATEGORIES: CategoryCardData[] = [
  {
    id: "cat-clothing",
    name: "Clothing",
    slug: "clothing",
    description: "Technical knitwear, outerwear & sartorial garments",
    imageUrl: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Minimalist Apparel & Clothing Collection",
    highlightTag: "New Season",
  },
  {
    id: "cat-accessories",
    name: "Accessories",
    slug: "accessories",
    description: "Handcrafted leather goods, belts & travel bags",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Handcrafted Leather Accessories",
    highlightTag: "Essential",
  },
  {
    id: "cat-equipment",
    name: "Equipment",
    slug: "equipment",
    description: "High-grade training essentials, care kits & gear",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Performance Training Equipment and Gear",
    highlightTag: "Performance",
  },
  {
    id: "cat-footwear",
    name: "Footwear",
    slug: "sneakers",
    description: "Signature silhouettes, dress oxfords & runners",
    imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Signature Athletic & Luxury Footwear",
    highlightTag: "Best Sellers",
  },
];

export function CategoryShowcaseGrid({ categories }: CategoryShowcaseGridProps) {
  const items = categories && categories.length > 0 ? categories : DEFAULT_LIFESTYLE_CATEGORIES;

  return (
    <section
      id="storefront-category-grid"
      aria-label="Multi-Category Lifestyle Grid"
      className="w-full bg-[#FFFFFF] py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 pb-4 border-b border-[#E5E5E5]">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#757575] block mb-1">
              Curated Collections
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111]">
              Shop By Category
            </h2>
          </div>

          <Link
            href="/shop"
            className="mt-3 sm:mt-0 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111] hover:text-[#757575] transition-colors"
          >
            <span>Explore All Departments</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Modular 3-4 Column Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((cat, idx) => (
            <CategoryCard key={cat.id || cat.slug} category={cat} priority={idx < 2} />
          ))}
        </div>
      </div>
    </section>
  );
}
