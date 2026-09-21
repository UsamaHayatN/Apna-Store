import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { collectionService } from "@/lib/collections/collection-service";
import { discoveryService } from "@/lib/storefront/discovery-service";
import { ProductListingView } from "@/components/storefront/ProductListingView";
import { siteConfig } from "@/config/site";

// ISR: Revalidate every 120 seconds for collection pages
export const revalidate = 120;

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await collectionService.getCollectionBySlug(slug);

  if (!collection) {
    return {
      title: `Collection Not Found | ${siteConfig.name}`,
    };
  }

  return {
    title: `${collection.title} | ${siteConfig.name}`,
    description: collection.description || `Explore our curated ${collection.title} capsule collection.`,
    openGraph: {
      title: `${collection.title} | ${siteConfig.name}`,
      description: collection.description || `Explore our curated ${collection.title} capsule collection.`,
    },
  };
}

export default async function CollectionDetailPage({ params, searchParams }: CollectionPageProps) {
  const { slug } = await params;
  const collection = await collectionService.getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  const resolvedParams = searchParams ? await searchParams : {};

  // Build discovery query restricted to this collection
  const query = discoveryService.parseQueryParams({
    ...resolvedParams,
    collection: slug,
  });

  const discoveryResult = await discoveryService.searchAndFilter(query);

  return (
    <div className="bg-[#FFFFFF] min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#757575]">
            <Link href="/" className="hover:text-[#111111] transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-[#111111] transition-colors">
              Collections
            </Link>
            <span>/</span>
            <span className="text-[#111111] font-bold">{collection.title}</span>
          </nav>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-[#111111] text-[#FFFFFF] py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#AAAAAA]">
            Curated Capsule Collection
          </span>
          <h1 className="mt-2 text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#FFFFFF]">
            {collection.title}
          </h1>
          {collection.description && (
            <p className="mt-2 max-w-2xl text-xs sm:text-sm text-[#CCCCCC] font-light leading-relaxed">
              {collection.description}
            </p>
          )}
        </div>
      </div>

      {/* Production Product Discovery View */}
      <ProductListingView
        initialTitle={collection.title}
        subtitle="Exclusive pairings and limited production silhouettes"
        initialCollectionSlug={slug}
        discoveryResult={discoveryResult}
        baseUrl={`/collection/${slug}`}
      />
    </div>
  );
}
