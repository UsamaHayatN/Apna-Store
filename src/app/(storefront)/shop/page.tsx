import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { discoveryService } from "@/lib/storefront/discovery-service";
import { ProductListingView } from "@/components/storefront/ProductListingView";
import { siteConfig } from "@/config/site";

// ISR: Revalidate every 120 seconds for shop page
export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Shop All Collections | ${siteConfig.name}`,
    description:
      "Explore handcrafted Goodyear-welted dress shoes, leather boots, luxury sneakers, and curated garments.",
    openGraph: {
      title: `Shop All Collections | ${siteConfig.name}`,
      description:
        "Explore handcrafted Goodyear-welted dress shoes, leather boots, luxury sneakers, and curated garments.",
    },
  };
}

interface ShopPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const query = discoveryService.parseQueryParams(resolvedParams);

  // Perform full discovery search and facet aggregation
  const discoveryResult = await discoveryService.searchAndFilter(query);

  return (
    <div className="bg-[#FFFFFF] min-h-screen">
      {/* Breadcrumbs Navigation */}
      <div className="border-b border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#757575]">
            <Link href="/" className="hover:text-[#111111] transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <span className="text-[#111111] font-bold">Catalog</span>
          </nav>
        </div>
      </div>

      {/* Production Product Discovery View */}
      <ProductListingView
        initialTitle="All Products"
        subtitle="Handcrafted leather footwear, Goodyear-welted boots, and technical apparel"
        discoveryResult={discoveryResult}
        baseUrl="/shop"
      />
    </div>
  );
}
