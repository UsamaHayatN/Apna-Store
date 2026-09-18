"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Layers } from "lucide-react";

/* 
  EXACT CATEGORY GRID & CARD STYLING DECODING:
  - Container Background: Clean #F5F5F5 (Light-200) image canvas
  - Hover Interaction: Subtle zoom effect on hover (scale-105)
  - Typography: Bottom-left bold title text (#111111 / Dark-900)
  - Subtitle/Metadata: #757575 (Dark-700)
  - Supporting Borders & Dividers: #E5E5E5 (Light-300)
*/

export interface CategoryCardData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  productCount?: number;
  highlightTag?: string;
}

interface CategoryCardProps {
  category: CategoryCardData;
  priority?: boolean;
}

export function CategoryCard({ category, priority = false }: CategoryCardProps) {
  const [imgError, setImgError] = useState(false);
  const href = `/category/${category.slug}`;

  return (
    <Link
      id={`category-card-${category.slug}`}
      href={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-[#FFFFFF] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#111111]"
    >
      {/* Category Image Area: Clean #F5F5F5 (Light-200) image container background with subtle zoom effect */}
      <div className="relative aspect-[4/5] sm:aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#F5F5F5] border border-[#E5E5E5]">
        {category.imageUrl && !imgError ? (
          <Image
            src={category.imageUrl}
            alt={category.imageAlt || category.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5] p-6 text-center text-[#AAAAAA]">
            <Layers className="h-10 w-10 stroke-1 text-[#AAAAAA]" />
          </div>
        )}

        {/* Floating Top Tag if applicable */}
        {category.highlightTag && (
          <span className="absolute top-3 left-3 bg-[#FFFFFF] text-[#111111] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
            {category.highlightTag}
          </span>
        )}

        {/* Gradient shadow overlay for bottom-left contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Bottom-left bold title text (#FFFFFF on overlay / #111111 on card) */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-left flex items-end justify-between z-10">
          <div>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#FFFFFF] drop-shadow-xs group-hover:translate-x-1 transition-transform">
              {category.name}
            </h3>
            {category.description && (
              <p className="mt-1 text-xs text-[#E5E5E5] font-normal line-clamp-1">
                {category.description}
              </p>
            )}
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFFFFF] text-[#111111] shadow-md group-hover:bg-[#111111] group-hover:text-[#FFFFFF] transition-colors shrink-0 ml-2">
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
