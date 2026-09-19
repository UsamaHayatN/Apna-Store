import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getUserWithDetails } from "@/lib/auth/user-store";
import { hasPermission } from "@/lib/auth/permissions";
import { AdminCustomerDetailClient } from "@/components/admin/AdminCustomerDetailClient";

export const dynamic = "force-dynamic";

interface AdminCustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDetailPage({ params }: AdminCustomerDetailPageProps) {
  const { id } = await params;
  const currentUser = await requirePermission("customers.read", "/admin/login");

  const customerData = await getUserWithDetails(id);
  if (!customerData) {
    notFound();
  }

  // Explicit permission check for mutating customer
  const canEdit = hasPermission(currentUser.role, "customers.update");

  // Sanitize: strip out password hashes and internal auth credentials
  const sanitizedCustomer = {
    id: customerData.id,
    email: customerData.email,
    firstName: customerData.firstName ?? null,
    lastName: customerData.lastName ?? null,
    phone: customerData.phone ?? null,
    role: customerData.role,
    status: customerData.status,
    emailVerifiedAt: customerData.emailVerifiedAt ?? null,
    createdAt: customerData.createdAt,
    updatedAt: customerData.updatedAt,
    ordersCount: customerData.ordersCount,
    totalSpend: customerData.totalSpend,
    addresses: customerData.addresses,
    orders: customerData.orders,
  };

  return (
    <AdminCustomerDetailClient
      customer={sanitizedCustomer}
      canEdit={canEdit}
    />
  );
}
