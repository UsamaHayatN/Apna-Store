import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { requireAdminOrStaff } from "@/lib/auth/guards";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce server-side staff/admin authorization for all administrative dashboard routes
  await requireAdminOrStaff("/admin/login");

  return (
    <div className="flex min-h-screen bg-neutral-100/60">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
