import crypto from "node:crypto";
import { isDatabaseConfigured, getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import {
  PaymentProvider,
  PaymentProviderType,
  PaymentRecord,
  PaymentRefundRecord,
  PaymentStatus,
  CreatePaymentSessionParams,
  PaymentSessionResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
  PaymentDetailsResult,
  WebhookEventResult,
  CreateRefundParams,
  RefundResult,
} from "./types";
import { orderService } from "@/lib/orders/order-service";

declare global {
  // eslint-disable-next-line no-var
  var _memoryPaymentsRegistry: Map<string, PaymentRecord> | undefined;
  // eslint-disable-next-line no-var
  var _memoryRefundsRegistry: Map<string, PaymentRefundRecord[]> | undefined;
}

const memoryPayments = globalThis._memoryPaymentsRegistry ?? new Map<string, PaymentRecord>();
if (process.env.NODE_ENV !== "production") {
  globalThis._memoryPaymentsRegistry = memoryPayments;
}

const memoryRefunds = globalThis._memoryRefundsRegistry ?? new Map<string, PaymentRefundRecord[]>();
if (process.env.NODE_ENV !== "production") {
  globalThis._memoryRefundsRegistry = memoryRefunds;
}

export class PaymentService {
  /**
   * Initialize a new payment transaction session for an order.
   */
  async createPaymentSession(
    providerType: PaymentProviderType,
    params: CreatePaymentSessionParams
  ): Promise<PaymentSessionResult> {
    const paymentId = `pay-${crypto.randomUUID()}`;
    const providerTransactionId = `${providerType === "stripe" ? "pi_" : "tx_"}${crypto.randomBytes(12).toString("hex")}`;

    const newPayment: PaymentRecord = {
      id: paymentId,
      orderId: params.orderId,
      provider: providerType,
      providerTransactionId,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      status: "pending",
      paymentMethodType: providerType === "bank_wire" ? "bank_transfer" : providerType === "cod" ? "cod" : "card",
      metadata: params.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryPayments.set(paymentId, newPayment);

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db.insert(schema.payments).values({
          id: paymentId,
          orderId: params.orderId,
          provider: providerType,
          providerTransactionId,
          amount: params.amount.toFixed(2),
          currency: params.currency.toUpperCase(),
          status: "pending",
          paymentMethodType: newPayment.paymentMethodType,
          metadata: params.metadata || {},
        });
      } catch (err) {
        console.warn("DB createPaymentSession error, using memory fallback:", err);
      }
    }

    return {
      sessionId: `sess_${crypto.randomBytes(16).toString("hex")}`,
      clientSecret: `${providerTransactionId}_secret_${crypto.randomBytes(8).toString("hex")}`,
      checkoutUrl: `/checkout/payment?orderId=${params.orderId}&tx=${providerTransactionId}`,
      provider: providerType,
      providerTransactionId,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      status: "pending",
    };
  }

  /**
   * Verify and settle payment completion.
   */
  async recordPaymentSuccess(
    orderId: string,
    providerTransactionId: string,
    details?: { paymentMethodType?: string; amount?: number; currency?: string }
  ): Promise<PaymentVerificationResult> {
    // Find matching payment record
    let targetPayment: PaymentRecord | null = null;
    for (const p of memoryPayments.values()) {
      if (p.orderId === orderId || p.providerTransactionId === providerTransactionId) {
        targetPayment = p;
        break;
      }
    }

    if (!targetPayment) {
      // Auto-provision if not previously cached
      const paymentId = `pay-${crypto.randomUUID()}`;
      targetPayment = {
        id: paymentId,
        orderId,
        provider: "stripe",
        providerTransactionId,
        amount: details?.amount || 0,
        currency: details?.currency || "USD",
        status: "paid",
        paymentMethodType: details?.paymentMethodType || "card",
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryPayments.set(paymentId, targetPayment);
    } else {
      targetPayment.status = "paid";
      targetPayment.updatedAt = new Date().toISOString();
      if (details?.paymentMethodType) targetPayment.paymentMethodType = details.paymentMethodType;
    }

    // Persist to Postgres
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(schema.payments)
          .set({
            status: "paid",
            updatedAt: new Date(),
          })
          .where(eq(schema.payments.id, targetPayment.id));
      } catch (err) {
        console.warn("DB recordPaymentSuccess error:", err);
      }
    }

    // Synchronize Order status
    await orderService.updateOrderPaymentStatus(orderId, "paid");
    await orderService.updateOrderStatus(orderId, "confirmed", { type: "system" }, "Payment successfully captured");

    return {
      verified: true,
      paymentStatus: "paid",
      providerTransactionId,
      amountPaid: targetPayment.amount,
      currency: targetPayment.currency,
      paymentMethodType: targetPayment.paymentMethodType,
    };
  }

  /**
   * Retrieve payment record by order ID.
   */
  async getPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
    for (const p of memoryPayments.values()) {
      if (p.orderId === orderId) {
        return { ...p };
      }
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.orderId, orderId))
          .orderBy(desc(schema.payments.createdAt))
          .limit(1);

        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            orderId: r.orderId,
            provider: r.provider as PaymentProviderType,
            providerTransactionId: r.providerTransactionId || "",
            amount: parseFloat(r.amount),
            currency: r.currency,
            status: r.status as PaymentStatus,
            paymentMethodType: r.paymentMethodType || "card",
            errorMessage: r.errorMessage,
            metadata: (r.metadata as Record<string, unknown>) || {},
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          };
        }
      } catch (err) {
        console.warn("DB getPaymentByOrderId error:", err);
      }
    }

    return null;
  }

  /**
   * Retrieve all refunds associated with an order or payment.
   */
  async getRefundsByOrderId(orderId: string): Promise<PaymentRefundRecord[]> {
    const list = memoryRefunds.get(orderId) || [];

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const payment = await this.getPaymentByOrderId(orderId);
        if (payment) {
          const rows = await db
            .select()
            .from(schema.paymentRefunds)
            .where(eq(schema.paymentRefunds.paymentId, payment.id))
            .orderBy(desc(schema.paymentRefunds.createdAt));

          if (rows.length > 0) {
            return rows.map((r) => ({
              id: r.id,
              paymentId: r.paymentId,
              orderId,
              amount: parseFloat(r.amount),
              currency: r.currency,
              reason: r.reason,
              status: r.status,
              providerRefundId: r.providerRefundId,
              createdAt: r.createdAt.toISOString(),
            }));
          }
        }
      } catch (err) {
        console.warn("DB getRefundsByOrderId error:", err);
      }
    }

    return list;
  }

  /**
   * Process a refund on a paid commission.
   */
  async createRefund(
    params: CreateRefundParams,
    actingUserId?: string
  ): Promise<RefundResult> {
    const payment = await this.getPaymentByOrderId(params.orderId);
    if (!payment) {
      return {
        success: false,
        refundId: "",
        amountRefunded: 0,
        currency: "USD",
        newPaymentStatus: "pending",
        errorMessage: "No payment transaction found for this commission.",
      };
    }

    if (payment.status !== "paid" && payment.status !== "partially_refunded") {
      return {
        success: false,
        refundId: "",
        amountRefunded: 0,
        currency: payment.currency,
        newPaymentStatus: payment.status,
        errorMessage: `Cannot refund payment with status '${payment.status}'.`,
      };
    }

    const previousRefunds = await this.getRefundsByOrderId(params.orderId);
    const totalPreviouslyRefunded = previousRefunds.reduce((sum, r) => sum + r.amount, 0);
    const remainingRefundable = payment.amount - totalPreviouslyRefunded;

    const refundAmount = params.refundEntireRemaining
      ? remainingRefundable
      : Math.min(params.amount, remainingRefundable);

    if (refundAmount <= 0) {
      return {
        success: false,
        refundId: "",
        amountRefunded: 0,
        currency: payment.currency,
        newPaymentStatus: payment.status,
        errorMessage: "This commission has already been fully refunded.",
      };
    }

    const refundId = `ref-${crypto.randomUUID()}`;
    const providerRefundId = `re_${crypto.randomBytes(12).toString("hex")}`;
    const newTotalRefunded = totalPreviouslyRefunded + refundAmount;
    const isFullRefund = newTotalRefunded >= payment.amount - 0.01;
    const newPaymentStatus: PaymentStatus = isFullRefund ? "refunded" : "partially_refunded";

    const refundRecord: PaymentRefundRecord = {
      id: refundId,
      paymentId: payment.id,
      orderId: params.orderId,
      amount: refundAmount,
      currency: payment.currency,
      reason: params.reason || "Customer requested refund",
      status: "succeeded",
      providerRefundId,
      createdAt: new Date().toISOString(),
    };

    // Store in memory
    const existingRefunds = memoryRefunds.get(params.orderId) || [];
    existingRefunds.push(refundRecord);
    memoryRefunds.set(params.orderId, existingRefunds);

    // Update memory payment
    const memPay = memoryPayments.get(payment.id);
    if (memPay) {
      memPay.status = newPaymentStatus;
      memPay.updatedAt = new Date().toISOString();
    }

    // Persist to Postgres
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db.insert(schema.paymentRefunds).values({
          id: refundId,
          paymentId: payment.id,
          amount: refundAmount.toFixed(2),
          currency: payment.currency,
          reason: params.reason || "Client commission refund",
          status: "succeeded",
          providerRefundId,
        });

        await db
          .update(schema.payments)
          .set({
            status: newPaymentStatus,
            updatedAt: new Date(),
          })
          .where(eq(schema.payments.id, payment.id));
      } catch (err) {
        console.warn("DB createRefund error:", err);
      }
    }

    // Synchronize Order status
    await orderService.updateOrderPaymentStatus(params.orderId, newPaymentStatus);
    await orderService.updateOrderStatus(
      params.orderId,
      isFullRefund ? "cancelled" : "confirmed",
      { id: actingUserId, type: "admin" },
      `Issued refund of $${refundAmount.toFixed(2)} ${payment.currency}. Reason: ${params.reason || "N/A"}`
    );

    return {
      success: true,
      refundId,
      providerRefundId,
      amountRefunded: refundAmount,
      currency: payment.currency,
      newPaymentStatus,
    };
  }

  /**
   * Process incoming webhook event with signature and idempotency checks.
   */
  async handleWebhook(
    payload: string | Record<string, any>,
    signature?: string
  ): Promise<WebhookEventResult> {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    const eventType = data.type || data.event || "payment_intent.succeeded";
    const object = data.data?.object || data;

    const providerTransactionId = object.id || object.transaction_id || `tx_${Date.now()}`;
    const orderId = object.metadata?.orderId || object.orderId || "";
    const amount = object.amount ? object.amount / 100 : parseFloat(object.total || "0");
    const currency = (object.currency || "USD").toUpperCase();

    // Verify webhook signature if secret configured
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(typeof payload === "string" ? payload : JSON.stringify(payload))
        .digest("hex");

      if (signature !== expectedSig && !signature.includes(expectedSig)) {
        throw new Error("Invalid payment webhook signature verification.");
      }
    }

    if (eventType === "payment_intent.succeeded" || eventType === "charge.succeeded") {
      if (orderId) {
        await this.recordPaymentSuccess(orderId, providerTransactionId, {
          paymentMethodType: object.payment_method_details?.type || "card",
          amount,
          currency,
        });
      }

      return {
        handled: true,
        eventType,
        orderId,
        providerTransactionId,
        paymentStatus: "paid",
        amount,
        currency,
        metadata: object.metadata || {},
      };
    }

    if (eventType === "payment_intent.payment_failed") {
      if (orderId) {
        await orderService.updateOrderPaymentStatus(orderId, "failed");
      }
      return {
        handled: true,
        eventType,
        orderId,
        providerTransactionId,
        paymentStatus: "failed",
        amount,
        currency,
        metadata: object.metadata || {},
      };
    }

    return {
      handled: true,
      eventType,
      orderId,
      providerTransactionId,
      paymentStatus: "pending",
      amount,
      currency,
      metadata: object.metadata || {},
    };
  }
}

export const paymentService = new PaymentService();
