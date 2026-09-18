import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { discoveryService } from "@/lib/storefront/discovery-service";
import { ProductListingView } from "@/components/storefront/ProductListingView";
import { siteConfig } from "@/config/site";

interface SearchPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolvedParams = searchParams ? await searchParams : {};
  const queryTerm = resolvedParams.q || resolvedParams.search;
  const termStr = typeof queryTerm === "string" ? queryTerm : "";

  return {
    title: termStr ? `Search: "${termStr}" | ${siteConfig.name}` : `Catalog Search | ${siteConfig.name}`,
    description: "Search across our luxury footwear, handcrafted boots, and sartorial collections.",
  };
}

const POPULAR_SEARCH_TERMS = [
  "Oxford",
  "Boot",
  "Sneaker",
  "Loafer",
  "Chelsea",
  "Trail",
  "Black",
  "Cognac",
];

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const query = discoveryService.parseQueryParams(resolvedParams);
  const term = query.search || "";

  // Perform discovery search
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
            <span className="text-[#111111] font-bold">Search</span>
          </nav>
        </div>
      </div>

      {/* Search Header Banner */}
      <div className="border-b border-[#E5E5E5] bg-[#F5F5F5] py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
            Search Footwear & Apparel
          </h1>
          <p className="mt-1 text-xs text-[#757575] font-light">
            Search across styles, materials, Goodyear-welted silhouettes, sizes, and colorways.
          </p>

          {/* Search Input Form */}
          <form method="GET" action="/search" className="mt-5 max-w-2xl">
            <div className="relative flex items-center">
              <input
                type="search"
                name="search"
                defaultValue={term}
                placeholder="Search oxfords, boots, runners, loafers..."
                className="w-full rounded-full border border-[#CCCCCC] bg-[#FFFFFF] py-3 pl-11 pr-24 text-xs text-[#111111] placeholder-[#AAAAAA] focus:border-[#111111] focus:outline-none transition-colors shadow-xs"
              />
              <SearchIcon className="absolute left-4 h-4 w-4 text-[#757575]" />
              <button
                type="submit"
                className="absolute right-1.5 rounded-full bg-[#111111] text-[#FFFFFF] px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Popular Search Suggestions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#757575] mr-1">
              Popular Searches:
            </span>
            {POPULAR_SEARCH_TERMS.map((suggestion) => (
              <Link
                key={suggestion}
                href={`/search?search=${encodeURIComponent(suggestion)}`}
                className="rounded-full border border-[#E5E5E5] bg-[#FFFFFF] px-3 py-1 text-xs font-semibold text-[#111111] hover:border-[#111111] transition-colors"
              >
                {suggestion}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Production Product Discovery View */}
      <ProductListingView
        initialTitle={term ? `Results for "${term}"` : "Catalog Search"}
        subtitle={term ? `Found ${discoveryResult.total} matching products` : undefined}
        discoveryResult={discoveryResult}
        baseUrl="/search"
      />
    </div>
  );
}
