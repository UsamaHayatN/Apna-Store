import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { storefrontService } from "@/lib/storefront/storefront-service";
import { HeroSection } from "@/components/storefront/HeroSection";
import { CategoryShowcaseGrid } from "@/components/storefront/CategoryShowcaseGrid";
import { ProductCard } from "@/components/storefront/ProductCard";
import { FeaturedCollectionBanner } from "@/components/storefront/FeaturedCollectionBanner";
import { EditorialSection } from "@/components/storefront/EditorialSection";
import { TrustSection } from "@/components/storefront/TrustSection";
import { NewsletterSection } from "@/components/storefront/NewsletterSection";

/* 
  EXACT HOMEPAGE / STOREFRONT ARCHITECTURE:
  - Exact Color Palette:
    * Dark-900: #111111 (Text, primary headings, buttons)
    * Dark-700: #757575 (Subtitles, metadata, secondary text)
    * Dark-500: #AAAAAA (Borders, inactive states, icons)
    * Light-100: #FFFFFF (Primary card canvas, pure white backgrounds)
    * Light-200: #F5F5F5 (Product card image background canvas & hero container)
    * Light-300: #E5E5E5 (Dividers, horizontal rules, borders)
    * Light-400: #CCCCCC (Disabled buttons, subtle fills)
    * Green: #007D48 (Sustainability pill)
    * Red: #D33918 (Sale pill)
    * Orange: #D37918 (Best Seller pill)
*/

// Force dynamic rendering to ensure up-to-the-minute database synchronization
export const dynamic = "force-dynamic";

export default async function StorefrontHomePage() {
  const {
    featuredCategories,
    featuredProducts,
    newArrivals,
    featuredCollection,
  } = await storefrontService.getHomepageData();

  // Map category data to format expected by showcase grid
  const mappedCategories =
    featuredCategories && featuredCategories.length > 0
      ? featuredCategories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description || `Explore ${cat.name}`,
          imageUrl: cat.imageUrl || "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop",
          imageAlt: cat.imageAlt || cat.name,
        }))
      : undefined;

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 bg-[#FFFFFF]">
      {/* 1. HERO SECTION: #F5F5F5 Container, Left-aligned Bold Headline, Dual CTAs */}
      <HeroSection />

      {/* 2. MULTI-CATEGORY GRID: 3-4 Column modular layout with non-shoe/lifestyle categories ("Clothing", "Accessories", "Equipment") */}
      <CategoryShowcaseGrid categories={mappedCategories} />

      {/* 3. FEATURED / BEST SELLERS SECTION */}
      <section
        id="storefront-best-sellers"
        aria-label="Best Sellers & Featured Footwear"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#E5E5E5] pb-4 mb-8 sm:mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#757575] block mb-1">
              Popular & Trending
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111]">
              Best Sellers
            </h2>
          </div>
          <Link
            href="/shop?filter=featured"
            className="mt-3 sm:mt-0 text-xs font-bold uppercase tracking-wider text-[#111111] hover:text-[#757575] transition-colors inline-flex items-center gap-1.5"
          >
            <span>Shop All Best Sellers ({featuredProducts.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={idx < 4}
                overrideBadge={
                  idx === 0
                    ? "best-seller"
                    : idx === 1
                    ? "extra-discount"
                    : idx === 2
                    ? "sustainable"
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#E5E5E5] p-12 text-center bg-[#F5F5F5]">
            <ShoppingBag className="mx-auto h-8 w-8 text-[#AAAAAA] stroke-1 mb-3" />
            <p className="text-xs text-[#757575] uppercase tracking-wider">
              Curated selections are being prepared in the catalog.
            </p>
            <div className="mt-4">
              <Link
                href="/shop"
                className="text-xs font-bold uppercase tracking-wider text-[#111111] underline underline-offset-4"
              >
                Explore All Products
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 4. FEATURED CAPSULE DROP */}
      <FeaturedCollectionBanner collection={featuredCollection} />

      {/* 5. NEW RELEASES / NEW ARRIVALS */}
      <section
        id="storefront-new-arrivals"
        aria-label="Recent Drops & Releases"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#E5E5E5] pb-4 mb-8 sm:mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#757575] block mb-1">
              Fresh Drops
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111]">
              New Releases
            </h2>
          </div>
          <Link
            href="/shop?sort=newest"
            className="mt-3 sm:mt-0 text-xs font-bold uppercase tracking-wider text-[#111111] hover:text-[#757575] transition-colors inline-flex items-center gap-1.5"
          >
            <span>View All Arrivals</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {newArrivals.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {newArrivals.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                overrideBadge={
                  idx % 3 === 0
                    ? "extra-discount"
                    : idx % 3 === 1
                    ? "sustainable"
                    : "best-seller"
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#E5E5E5] p-12 text-center bg-[#F5F5F5]">
            <p className="text-xs text-[#757575] uppercase tracking-wider">
              New seasonal releases arriving soon.
            </p>
            <div className="mt-4">
              <Link
                href="/shop"
                className="text-xs font-bold uppercase tracking-wider text-[#111111] underline underline-offset-4"
              >
                Browse Available Pairs
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 6. CRAFTSMANSHIP EDITORIAL */}
      <EditorialSection />

      {/* 7. TRUST PILLARS & GUARANTEES */}
      <TrustSection />

      {/* 8. NEWSLETTER & PRIVATE ACCESS SIGNUP */}
      <NewsletterSection />
    </div>
  );
}
