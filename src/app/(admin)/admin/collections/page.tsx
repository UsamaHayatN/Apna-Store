import { requirePermission } from "@/lib/auth/guards";
import { collectionService } from "@/lib/collections/collection-service";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminCollectionListClient } from "@/components/admin/collections/AdminCollectionListClient";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  // Enforce server-side permissions
  await requirePermission("collections.read", "/admin/login");

  const result = await collectionService.listCollections({
    status: "all",
    limit: 100,
  });

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Collections" },
        ]}
      />

      <AdminCollectionListClient initialCollections={result.data || result.items || []} />
    </div>
  );
}
