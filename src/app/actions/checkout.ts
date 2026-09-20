"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { cartService } from "@/lib/cart/cart-service";
import { resolveCartIdentity } from "@/lib/cart/cart-session";
import { orderService } from "@/lib/orders/order-service";
import { paymentService } from "@/lib/payments/payment-service";
import { isDatabaseConfigured, getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export interface CheckoutShippingMethod {
  id: string;
  name: string;
  price: number;
  estimatedDays: string;
}

export const SHIPPING_METHODS: CheckoutShippingMethod[] = [
  {
    id: "standard",
    name: "Standard Atelier Delivery",
    price: 0.0,
    estimatedDays: "3-5 business days",
  },
  {
    id: "express",
    name: "Express Courier Delivery",
    price: 25.0,
    estimatedDays: "1-2 business days",
  },
  {
    id: "white_glove",
    name: "White Glove Concierge Delivery",
    price: 50.0,
    estimatedDays: "Next-day appointment with personal fitting specialist",
  },
];

import { couponService } from "@/lib/coupons/coupon-service";

export interface ValidateCouponResult {
  success: boolean;
  code?: string;
  discountType?: "percentage" | "fixed" | "free_shipping";
  discountValue?: number;
  discountAmount?: number;
  error?: string;
}

/**
 * Validate and apply a promotional voucher or atelier coupon.
 */
export async function validateCouponAction(
  code: string,
  subtotal: number
): Promise<ValidateCouponResult> {
  return couponService.validateCoupon(code, subtotal);
}

export interface CheckoutPayload {
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    recipientName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    countryCode: string;
    phone: string;
  };
  billingAddress?: {
    recipientName: string;
    addressLine1: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    countryCode: string;
  } | null;
  shippingMethodId: string;
  paymentMethod: {
    type: "card" | "wire" | "cod";
    cardholderName?: string;
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
  };
  couponCode?: string;
  customerNotes?: string;
}

export interface ProcessCheckoutResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

/**
 * Execute atomic checkout, order compilation, and bag clearance.
 */
export async function processCheckoutAction(
  payload: CheckoutPayload
): Promise<ProcessCheckoutResult> {
  try {
    const { identity } = await resolveCartIdentity();

    // Load active cart
    const cart = await cartService.getCart(identity);

    if (!cart || cart.items.length === 0) {
      return { success: false, error: "Your shopping bag is currently empty." };
    }

    if (cart.hasUnavailableItems) {
      return {
        success: false,
        error: "One or more silhouettes in your bag are no longer available. Please review your cart before proceeding.",
      };
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!payload.customerEmail || !emailRegex.test(payload.customerEmail)) {
      return { success: false, error: "A valid client email address is required for commission documentation." };
    }

    // Validate shipping address
    const addr = payload.shippingAddress;
    if (!addr.recipientName?.trim() || !addr.addressLine1?.trim() || !addr.city?.trim() || !addr.postalCode?.trim()) {
      return { success: false, error: "Please complete all required fields for the delivery destination." };
    }

    // Resolve shipping method
    const shippingMethod =
      SHIPPING_METHODS.find((m) => m.id === payload.shippingMethodId) || SHIPPING_METHODS[0];

    // Calculate coupon discount
    let discountAmount = 0;
    let validCouponCode: string | null = null;
    if (payload.couponCode) {
      const couponRes = await validateCouponAction(payload.couponCode, cart.subtotal);
      if (couponRes.success && couponRes.discountAmount) {
        discountAmount = couponRes.discountAmount;
        validCouponCode = couponRes.code || null;
      }
    }

    // Calculate taxes & total
    const taxableAmount = Math.max(0, cart.subtotal - discountAmount);
    const taxRate = 0.08; // 8% standard estimate
    const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
    const totalAmount = Math.round((taxableAmount + shippingMethod.price + taxAmount) * 100) / 100;

    // Mask card digits if payment by card
    const paymentSnapshot: {
      type: string;
      last4?: string;
      cardholderName?: string;
      brand?: string;
    } = {
      type: payload.paymentMethod.type,
    };

    if (payload.paymentMethod.type === "card") {
      const rawNumber = payload.paymentMethod.cardNumber?.replace(/\s+/g, "") || "4242";
      paymentSnapshot.last4 = rawNumber.slice(-4) || "4242";
      paymentSnapshot.cardholderName = payload.paymentMethod.cardholderName || addr.recipientName;
      paymentSnapshot.brand = rawNumber.startsWith("3")
        ? "American Express"
        : rawNumber.startsWith("5")
        ? "Mastercard"
        : "Visa";
    }

    // Atomic order creation
    const order = await orderService.createOrder({
      userId: identity.userId || null,
      customerEmail: payload.customerEmail.trim().toLowerCase(),
      customerPhone: payload.customerPhone || addr.phone || null,
      shippingAddress: addr,
      billingAddress: payload.billingAddress || addr,
      shippingMethod,
      paymentMethod: paymentSnapshot,
      items: cart.items,
      subtotal: cart.subtotal,
      discountAmount,
      couponCode: validCouponCode,
      taxAmount,
      totalAmount,
      customerNotes: payload.customerNotes || null,
    });

    // Create payment session and record transaction
    try {
      const paymentSession = await paymentService.createPaymentSession("stripe", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: totalAmount,
        currency: "USD",
        customerEmail: payload.customerEmail.trim().toLowerCase(),
        customerName: addr.recipientName,
      });

      await paymentService.recordPaymentSuccess(order.id, paymentSession.providerTransactionId, {
        paymentMethodType: payload.paymentMethod.type,
        amount: totalAmount,
        currency: "USD",
      });
    } catch (payErr) {
      console.warn("Payment transaction capture warning:", payErr);
    }

    // Clear cart immediately
    await cartService.clearCart(identity);

    revalidatePath("/cart");
    revalidatePath("/account");
    revalidatePath("/account/orders");
    revalidatePath("/admin/orders");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (err: unknown) {
    console.error("processCheckoutAction exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to finalize commission at this time.",
    };
  }
}
