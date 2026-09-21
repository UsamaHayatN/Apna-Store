import { Metadata } from "next";
import { notFound } from "next/navigation";
import { pdpService } from "@/lib/storefront/pdp-service";
import { ProductDetailView } from "@/components/storefront/ProductDetailView";

// ISR: Revalidate every 120 seconds for product pages
export const revalidate = 120;

/* 
  PRODUCT DETAIL PAGE ROUTE (Next.js 15 App Router):
  - params MUST be awaited: params: Promise<{ slug: string }>
  - Exact Color System: #111111, #757575, #AAAAAA, #FFFFFF, #F5F5F5, #E5E5E5, #D37918, #D33918, #007D48
  - Dynamic PDP Service: generic attribute matrix, inventory-aware variants, price resolution
  - Full Schema.org JSON-LD and OpenGraph metadata
*/

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await pdpService.getPdpProduct(slug);

  if (!product) {
    return {
      title: "Product Not Found | Atelier Men's Footwear",
      description: "The requested footwear could not be found.",
    };
  }

  const title = `${product.title} | Atelier Men's Footwear`;
  const description =
    product.shortDescription ||
    product.description ||
    `Discover the ${product.title} crafted with premium materials, refined silhouettes, and bespoke atelier comfort.`;
  const primaryImage = product.media?.[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: primaryImage ? [{ url: primaryImage, alt: product.title }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: primaryImage ? [primaryImage] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // 1. Fetch unified PDP product through pdpService (DB + static catalog fallback)
  const product = await pdpService.getPdpProduct(slug);

  if (!product) {
    notFound();
  }

  // 2. Fetch curated recommendations
  const recommendedProducts = await pdpService.getRecommendedProducts(
    slug,
    product.primaryCategory?.slug,
    4
  );

  // 3. Schema.org JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription || product.description,
    image: product.media?.map((m) => m.url) || [],
    sku: product.modelCode || product.styleCode || product.id,
    brand: {
      "@type": "Brand",
      name: "Atelier",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: product.basePrice,
      highPrice: product.basePrice,
      offerCount: product.variants?.length || 1,
      availability:
        product.inStock !== false
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailView
        product={product}
        recommendedProducts={recommendedProducts}
      />
    </>
  );
}


