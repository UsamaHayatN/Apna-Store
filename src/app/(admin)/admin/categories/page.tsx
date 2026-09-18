import { requirePermission } from "@/lib/auth/guards";
import { categoryService } from "@/lib/categories/category-service";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminCategoryClient } from "@/components/admin/categories/AdminCategoryClient";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  // Enforce server-side permissions
  await requirePermission("categories.read", "/admin/login");

  const [categories, tree] = await Promise.all([
    categoryService.listCategories({ includeArchived: true, includeInactive: true }),
    categoryService.getCategoryTree({ includeArchived: true, includeInactive: true }),
  ]);

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Categories" },
        ]}
      />

      <AdminCategoryClient
        initialCategories={categories}
        initialTree={tree}
      />
    </div>
  );
}
