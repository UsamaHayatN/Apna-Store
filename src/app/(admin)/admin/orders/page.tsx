import { requirePermission } from "@/lib/auth/guards";
import { orderService } from "@/lib/orders/order-service";
import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requirePermission("orders.read", "/admin/login");
  const orders = await orderService.getAllOrders();

  return <AdminOrdersClient orders={orders} />;
}
