import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/guards";
import { productService } from "@/lib/products/product-service";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminProductListClient } from "@/components/admin/AdminProductListClient";

export const dynamic = "force-dynamic";

interface AdminProductsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    productType?: string;
    status?: "all" | "active" | "draft" | "archived";
    featured?: string;
    newArrival?: string;
    onSale?: string;
    sort?:
      | "newest"
      | "oldest"
      | "name_asc"
      | "name_desc"
      | "price_asc"
      | "price_desc"
      | "updated";
    page?: string;
  }>;
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  // Server-side authorization check
  await requirePermission("products.read", "/admin/login");

  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const parsedQuery = {
    search: resolvedParams.search || undefined,
    category: resolvedParams.category || undefined,
    productType: resolvedParams.productType || undefined,
    status: resolvedParams.status || "all",
    featured: resolvedParams.featured === "true" ? true : undefined,
    newArrival: resolvedParams.newArrival === "true" ? true : undefined,
    onSale: resolvedParams.onSale === "true" ? true : undefined,
    sort: resolvedParams.sort || "newest",
    page: isNaN(page) ? 1 : page,
    limit: 10,
  };

  const [productsResult, categories, productTypes] = await Promise.all([
    productService.getProducts(parsedQuery),
    productService.getCategories(),
    productService.getProductTypes(),
  ]);

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products" },
        ]}
      />

      <Suspense fallback={<div className="p-8 text-center text-xs text-neutral-500">Loading catalog data...</div>}>
        <AdminProductListClient
          initialResult={productsResult}
          categories={categories}
          productTypes={productTypes}
          initialFilters={{
            search: parsedQuery.search,
            category: parsedQuery.category,
            productType: parsedQuery.productType,
            status: parsedQuery.status,
            featured: parsedQuery.featured,
            newArrival: parsedQuery.newArrival,
            onSale: parsedQuery.onSale,
            sort: parsedQuery.sort,
            page: parsedQuery.page,
          }}
        />
      </Suspense>
    </div>
  );
}
