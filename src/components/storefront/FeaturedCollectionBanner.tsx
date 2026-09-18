import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { StorefrontCollectionWithProducts } from "@/lib/storefront/storefront-service";
import { ProductCard } from "./ProductCard";

/* 
  FEATURED COLLECTION BANNER DECODING:
  - Background: #F5F5F5 (Light-200) container with #111111 (Dark-900) contrast banner
  - Typography: #111111 headings, #757575 subtitles
  - CTAs: Rounded pills in #111111 or #FFFFFF
*/

interface FeaturedCollectionBannerProps {
  collection: StorefrontCollectionWithProducts | null;
}

export function FeaturedCollectionBanner({ collection }: FeaturedCollectionBannerProps) {
  if (!collection) {
    // Graceful fallback when no collection is actively featured
    return (
      <section
        id="storefront-featured-collection"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl bg-[#F5F5F5] border border-[#E5E5E5] p-8 sm:p-12 lg:p-14">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#757575]">
              Curated Capsule Drop
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-[#111111]">
              The Heritage Benchmark Collection
            </h2>
            <p className="text-sm text-[#757575] font-normal leading-relaxed">
              Archival Goodyear-welted oxfords, wholecuts, and minimalist trainers constructed from hand-selected French boxcalf. Built for elevated performance and timeless style.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-[#111111] text-[#FFFFFF] px-6 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-xs"
              >
                <span>Discover Archival Pairs</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const fallbackImage =
    "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=1200&auto=format&fit=crop";

  return (
    <section
      id="storefront-featured-collection"
      aria-label={`Featured Collection: ${collection.title}`}
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Editorial Image & Banner Details */}
          <div className="relative min-h-[360px] lg:col-span-5 bg-[#111111] text-[#FFFFFF] p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
            <div className="absolute inset-0 z-0">
              <Image
                src={collection.imageUrl || fallbackImage}
                alt={collection.imageAlt || collection.title}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-center opacity-40 filter contrast-110"
              />
              <div className="absolute inset-0 bg-[#111111]/75" />
            </div>

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFFFF]/10 backdrop-blur-xs border border-[#FFFFFF]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#FFFFFF]">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Featured Capsule Drop</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-tight text-[#FFFFFF]">
                {collection.title}
              </h2>
              {collection.description && (
                <p className="text-xs sm:text-sm text-[#E5E5E5] font-normal leading-relaxed">
                  {collection.description}
                </p>
              )}
            </div>

            <div className="relative z-10 pt-6">
              <Link
                href={`/collection/${collection.slug}`}
                className="inline-flex items-center gap-2 bg-[#FFFFFF] text-[#111111] px-6 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#F5F5F5] transition-colors shadow-xs"
              >
                <span>View Full Capsule</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Collection Showcase Products */}
          <div className="lg:col-span-7 p-6 sm:p-8 bg-[#FFFFFF] flex flex-col justify-center">
            <div className="mb-4 flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#757575]">
                Highlights from {collection.title}
              </span>
              <Link
                href={`/collection/${collection.slug}`}
                className="text-xs font-bold uppercase tracking-wider text-[#111111] hover:text-[#757575] transition-colors inline-flex items-center gap-1"
              >
                <span>Explore All ({collection.productCount || collection.products.length})</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {collection.products && collection.products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {collection.products.slice(0, 2).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#757575]">
                Capsule models are arriving in the atelier catalog.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
