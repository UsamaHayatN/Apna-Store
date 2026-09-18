import { requirePermission } from "@/lib/auth/guards";
import { listAllUsers } from "@/lib/auth/user-store";
import { AdminCustomersClient } from "@/components/admin/AdminCustomersClient";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const currentUser = await requirePermission("customers.read", "/admin/login");
  const { users, stats } = await listAllUsers();

  return (
    <AdminCustomersClient
      currentUser={currentUser}
      initialUsers={users}
      initialStats={stats}
    />
  );
}
