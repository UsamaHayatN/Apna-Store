import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { orderService } from "@/lib/orders/order-service";
import { paymentService } from "@/lib/payments/payment-service";
import { shippingService } from "@/lib/shipping/shipping-service";
import { AdminOrderDetailClient } from "@/components/admin/AdminOrderDetailClient";

export const dynamic = "force-dynamic";

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const currentUser = await requirePermission("orders.read", "/admin/login");

  const order = await orderService.getOrderById(id);
  if (!order) {
    notFound();
  }

  const payment = await paymentService.getPaymentByOrderId(order.id);
  const refunds = await paymentService.getRefundsByOrderId(order.id);
  const shipments = await shippingService.getShipmentsByOrderId(order.id);

  const canEdit = hasPermission(currentUser.role, "orders.update");

  return (
    <AdminOrderDetailClient
      order={order}
      payment={payment}
      refunds={refunds}
      shipments={shipments}
      canEdit={canEdit}
    />
  );
}
