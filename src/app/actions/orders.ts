"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { orderService } from "@/lib/orders/order-service";
import { shippingService } from "@/lib/shipping/shipping-service";
import { paymentService } from "@/lib/payments/payment-service";
import { CarrierName, ShipmentStatus } from "@/lib/shipping/types";

export interface OrderActionState {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Update the overarching lifecycle status of an order.
 */
export async function adminUpdateOrderStatusAction(
  orderId: string,
  newStatus: string,
  notes?: string
): Promise<OrderActionState> {
  try {
    const user = await requirePermission("orders.update", "/admin/login");

    await orderService.updateOrderStatus(
      orderId,
      newStatus,
      { id: user.id, type: user.role === "owner" || user.role === "admin" ? "admin" : "staff" },
      notes
    );

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderId}`);

    return { success: true, message: `Commission status updated to ${newStatus}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update order status." };
  }
}

/**
 * Dispatch a shipment for an order with a tracking number and carrier.
 */
export async function adminCreateShipmentAction(
  orderId: string,
  data: {
    carrier: string;
    trackingNumber: string;
    serviceName?: string;
    notes?: string;
  }
): Promise<OrderActionState> {
  try {
    await requirePermission("orders.update", "/admin/login");

    if (!data.trackingNumber?.trim()) {
      return { success: false, error: "Tracking number is required." };
    }

    const shipment = await shippingService.createShipment({
      orderId,
      carrier: data.carrier as CarrierName,
      trackingNumber: data.trackingNumber.trim(),
      serviceName: data.serviceName,
      notes: data.notes,
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderId}`);

    return {
      success: true,
      message: `Shipment created with ${shipment.carrier} (Tracking: ${shipment.trackingNumber}).`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create shipment." };
  }
}

/**
 * Update an existing shipment's tracking lifecycle (in_transit, out_for_delivery, delivered).
 */
export async function adminUpdateShipmentStatusAction(
  shipmentId: string,
  orderId: string,
  newStatus: ShipmentStatus
): Promise<OrderActionState> {
  try {
    await requirePermission("orders.update", "/admin/login");

    await shippingService.updateShipmentStatus(shipmentId, orderId, newStatus);

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderId}`);

    return { success: true, message: `Shipment status updated to ${newStatus}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update shipment status." };
  }
}

/**
 * Issue a financial refund on an order.
 */
export async function adminIssueRefundAction(
  orderId: string,
  amount: number,
  reason: string
): Promise<OrderActionState> {
  try {
    const user = await requirePermission("orders.update", "/admin/login");

    if (amount <= 0) {
      return { success: false, error: "Refund amount must be greater than zero." };
    }

    const result = await paymentService.createRefund(
      {
        orderId,
        amount,
        reason: reason.trim() || "Customer requested refund",
      },
      user.id
    );

    if (!result.success) {
      return { success: false, error: result.errorMessage || "Refund processing declined." };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderId}`);

    return {
      success: true,
      message: `Refund of $${result.amountRefunded.toFixed(2)} ${result.currency} processed successfully.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to issue refund." };
  }
}
