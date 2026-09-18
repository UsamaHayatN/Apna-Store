import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { categoryService } from "@/lib/categories/category-service";
import { discoveryService } from "@/lib/storefront/discovery-service";
import { ProductListingView } from "@/components/storefront/ProductListingView";
import { siteConfig } from "@/config/site";

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const CATEGORY_TITLE_MAP: Record<string, string> = {
  men: "Men's Collection",
  women: "Women's Collection",
  kids: "Kids' Footwear",
  clothing: "Apparel & Garments",
  accessories: "Leather Goods & Accessories",
  equipment: "Shoe Care & Equipment",
  sneakers: "Luxury Sneakers",
  boots: "Handcrafted Boots",
  "formal-shoes": "Formal & Dress Shoes",
  "casual-shoes": "Casual Footwear",
  sandals: "Sandals & Slides",
  "sports-shoes": "Athletic & Performance Shoes",
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const matchedCategory = await categoryService.getCategoryBySlug(slug);
  const title =
    matchedCategory?.name ||
    CATEGORY_TITLE_MAP[slug.toLowerCase()] ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    title: `${title} | ${siteConfig.name}`,
    description: matchedCategory?.description || `Explore our curated selection of ${title}.`,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description: matchedCategory?.description || `Explore our curated selection of ${title}.`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const resolvedParams = searchParams ? await searchParams : {};

  // 1. Resolve Category Details
  const matchedCategory = await categoryService.getCategoryBySlug(slug);
  const title =
    matchedCategory?.name ||
    CATEGORY_TITLE_MAP[slug.toLowerCase()] ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  // 2. Build Query with category slug bound
  const query = discoveryService.parseQueryParams({
    ...resolvedParams,
    category: slug,
  });

  // 3. Execute Discovery Search with Facets
  const discoveryResult = await discoveryService.searchAndFilter(query);

  return (
    <div className="bg-[#FFFFFF] min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#757575]">
            <Link href="/" className="hover:text-[#111111] transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-[#111111] transition-colors">
              Catalog
            </Link>
            <span>/</span>
            <span className="text-[#111111] font-bold">{title}</span>
          </nav>
        </div>
      </div>

      {/* Production Product Discovery View */}
      <ProductListingView
        initialTitle={title}
        subtitle={matchedCategory?.description || `Curated ${title.toLowerCase()} handcrafted with premium materials`}
        initialCategorySlug={slug}
        discoveryResult={discoveryResult}
        baseUrl={`/category/${slug}`}
      />
    </div>
  );
}
