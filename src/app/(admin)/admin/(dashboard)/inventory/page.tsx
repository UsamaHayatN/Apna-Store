import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { inventoryService } from "@/lib/inventory/inventory-service";
import { AdminInventoryClient } from "@/components/admin/inventory/AdminInventoryClient";

export const metadata = {
  title: "Inventory Management & Ledger | Admin Atelier",
  description: "Enterprise variant-level stock management, audit trails, and inventory controls.",
};

export default async function AdminInventoryPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login?redirect=/admin/inventory");
  }

  if (!hasPermission(user.role, "inventory.read")) {
    redirect("/admin?error=unauthorized_inventory");
  }

  const { items, stats } = await inventoryService.listInventory();

  return <AdminInventoryClient initialItems={items} initialStats={stats} />;
}
