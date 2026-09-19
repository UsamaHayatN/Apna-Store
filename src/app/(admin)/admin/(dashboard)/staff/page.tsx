import { requirePermission } from "@/lib/auth/guards";
import { listStaffAndAdminUsers } from "@/lib/auth/user-store";
import { AdminStaffClient } from "@/components/admin/AdminStaffClient";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const currentUser = await requirePermission("roles.read", "/admin?error=forbidden");
  const staff = await listStaffAndAdminUsers();

  return <AdminStaffClient currentUser={currentUser} initialStaff={staff} />;
}
