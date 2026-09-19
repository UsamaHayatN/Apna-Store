import { requirePermission } from "@/lib/auth/guards";
import { productService } from "@/lib/products/product-service";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  // Server-side authorization check: must have products.create permission
  await requirePermission("products.create", "/admin?error=forbidden");

  const [categories, productTypes] = await Promise.all([
    productService.getCategories(),
    productService.getProductTypes(),
  ]);

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: "New Product" },
        ]}
      />

      <ProductForm
        categories={categories}
        productTypes={productTypes}
        mode="create"
      />
    </div>
  );
}
