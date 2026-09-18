import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { collectionService } from "@/lib/collections/collection-service";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminCollectionDetailClient } from "@/components/admin/collections/AdminCollectionDetailClient";

export const dynamic = "force-dynamic";

interface AdminCollectionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCollectionDetailPage({
  params,
}: AdminCollectionDetailPageProps) {
  await requirePermission("collections.read", "/admin/login");

  const { id } = await params;
  const collection = await collectionService.getCollectionById(id);

  if (!collection) {
    notFound();
  }

  const collectionProducts = await collectionService.getCollectionProducts(id);

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Collections", href: "/admin/collections" },
          { label: collection.title },
        ]}
      />

      <AdminCollectionDetailClient
        collection={collection}
        initialProducts={collectionProducts}
      />
    </div>
  );
}
