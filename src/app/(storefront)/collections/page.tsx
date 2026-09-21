import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Layers, Sparkles, ArrowLeft } from "lucide-react";
import { collectionService } from "@/lib/collections/collection-service";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Curated Capsule Collections | ${siteConfig.name}`,
  description:
    "Explore our limited-run footwear capsules, artisanal fabrications, and seasonal design narratives engineered for modern distinction.",
  openGraph: {
    title: `Curated Capsule Collections | ${siteConfig.name}`,
    description:
      "Explore our limited-run footwear capsules, artisanal fabrications, and seasonal design narratives engineered for modern distinction.",
  },
};

// ISR: Revalidate every 120 seconds. Collections change infrequently.
export const revalidate = 120;

export default async function CollectionsIndexPage() {
  const result = await collectionService.listCollections({ status: "published", limit: 50 });
  const collections = result.data || [];

  return (
    <div className="bg-[#FFFFFF] min-h-screen pb-20">
      {/* Breadcrumbs */}
      <div className="border-b border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#757575]"
          >
            <Link
              href="/"
              className="hover:text-[#111111] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <span className="text-[#111111] font-bold">Collections</span>
          </nav>
        </div>
      </div>

      {/* Hero Banner */}
      <section className="bg-[#111111] text-[#FFFFFF] py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#AAAAAA] mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Limited Release Capsules</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#FFFFFF]">
              Curated Collections
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#CCCCCC] font-light leading-relaxed">
              Each capsule represents an intentional narrative: precision Goodyear-welted benchcraft,
              unlined Mediterranean suedes, and contemporary metropolitan silhouettes made in small,
              numbered runs.
            </p>
          </div>
        </div>
      </section>

      {/* Collections Grid */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        {collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {collections.map((col, idx) => (
              <article
                key={col.id}
                className="group flex flex-col overflow-hidden border border-[#E5E5E5] bg-[#FFFFFF] hover:border-[#111111] transition-colors duration-200"
              >
                {/* Visual Imagery */}
                <Link
                  href={`/collection/${col.slug}`}
                  className="relative aspect-4/3 sm:aspect-16/10 w-full overflow-hidden bg-[#F5F5F5] block"
                >
                  <Image
                    src={
                      col.imageUrl ||
                      "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop"
                    }
                    alt={col.imageAlt || col.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    priority={idx === 0}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {col.isFeatured && (
                      <span className="bg-[#111111] text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                        Featured Drop
                      </span>
                    )}
                    {typeof col.productCount === "number" && (
                      <span className="bg-white/90 text-[#111111] text-[10px] font-bold uppercase tracking-wider px-2 py-1 backdrop-blur-xs">
                        {col.productCount} {col.productCount === 1 ? "Piece" : "Pieces"}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-6 bg-[#FFFFFF]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#757575]">
                      Capsule {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </span>
                    <h2 className="mt-1 text-lg sm:text-xl font-black uppercase tracking-tight text-[#111111]">
                      <Link
                        href={`/collection/${col.slug}`}
                        className="hover:underline underline-offset-4"
                      >
                        {col.title}
                      </Link>
                    </h2>
                    {col.description && (
                      <p className="mt-2 text-xs text-[#757575] leading-relaxed line-clamp-2">
                        {col.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#E5E5E5] flex items-center justify-between">
                    <Link
                      href={`/collection/${col.slug}`}
                      className="text-xs font-bold uppercase tracking-wider text-[#111111] hover:text-[#757575] transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>Explore Collection</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <span className="text-[11px] text-[#AAAAAA] font-mono">
                      /{col.slug}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-[#E5E5E5] bg-[#F5F5F5] p-12">
            <Layers className="mx-auto h-10 w-10 text-[#AAAAAA] mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#757575]">
              No capsule collections currently published.
            </p>
            <div className="mt-4">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center bg-[#111111] text-[#FFFFFF] px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#333333] transition-colors"
              >
                Browse All Products
              </Link>
            </div>
          </div>
        )}

        {/* Editorial Craftsmanship Callout */}
        <section className="mt-20 border-t border-[#E5E5E5] pt-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-[#E5E5E5] p-6 bg-[#F5F5F5]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#111111]">
                Benchcrafted Origins
              </span>
              <p className="mt-2 text-xs text-[#757575] leading-relaxed">
                Constructed using historic European lasts and slow-tanned leathers sourced from certified French and Italian tanneries.
              </p>
            </div>
            <div className="border border-[#E5E5E5] p-6 bg-[#F5F5F5]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#111111]">
                Limited Editions
              </span>
              <p className="mt-2 text-xs text-[#757575] leading-relaxed">
                Produced in strictly metered batches to preserve uncompromised stitch integrity, structural durability, and exclusivity.
              </p>
            </div>
            <div className="border border-[#E5E5E5] p-6 bg-[#F5F5F5]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#111111]">
                Sustainable Lifecycle
              </span>
              <p className="mt-2 text-xs text-[#757575] leading-relaxed">
                Goodyear-welted soles are fully recraftable for decades of sustained service, minimizing waste and honoring material longevity.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
