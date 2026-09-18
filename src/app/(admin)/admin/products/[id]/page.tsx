import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { productService } from "@/lib/products/product-service";
import { attributeService } from "@/lib/products/attribute-service";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  // Server-side authorization check: user must have products.read to view product form
  await requirePermission("products.read", "/admin/login");

  const { id } = await params;
  const product = await productService.getProductById(id);

  if (!product) {
    notFound();
  }

  const [categories, productTypes, allAttributes] = await Promise.all([
    productService.getCategories(),
    productService.getProductTypes(),
    attributeService.listAttributes(),
  ]);

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: product.title },
        ]}
      />

      <ProductForm
        initialData={product}
        categories={categories}
        productTypes={productTypes}
        allAttributes={allAttributes}
        mode="edit"
      />
    </div>
  );
}
