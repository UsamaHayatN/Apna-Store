/**
 * Payment Integration & Gateway Abstraction Types
 * Provider-agnostic e-commerce payment architecture.
 */

export type PaymentProviderType = "stripe" | "manual_card" | "bank_wire" | "cod";

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export interface CreatePaymentSessionParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface PaymentSessionResult {
  sessionId: string;
  clientSecret?: string;
  checkoutUrl?: string;
  provider: PaymentProviderType;
  providerTransactionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export interface VerifyPaymentParams {
  orderId: string;
  providerTransactionId: string;
  sessionOrTokenId?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  paymentStatus: PaymentStatus;
  providerTransactionId: string;
  amountPaid: number;
  currency: string;
  paymentMethodType: string;
  receiptUrl?: string;
  errorMessage?: string;
}

export interface PaymentDetailsResult {
  providerTransactionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethodType: string;
  customerEmail?: string;
  createdAt: string;
  refundedAmount?: number;
}

export interface WebhookEventResult {
  handled: boolean;
  eventType: string;
  orderId?: string;
  providerTransactionId: string;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface CreateRefundParams {
  orderId: string;
  paymentId?: string;
  amount: number;
  reason?: string;
  refundEntireRemaining?: boolean;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  providerRefundId?: string;
  amountRefunded: number;
  currency: string;
  newPaymentStatus: PaymentStatus;
  errorMessage?: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  provider: PaymentProviderType;
  providerTransactionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethodType: string;
  errorMessage?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRefundRecord {
  id: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  reason?: string | null;
  status: string;
  providerRefundId?: string | null;
  createdAt: string;
}

export interface PaymentProvider {
  name: PaymentProviderType;
  createPaymentSession(params: CreatePaymentSessionParams): Promise<PaymentSessionResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
  retrievePayment(providerTransactionId: string): Promise<PaymentDetailsResult>;
  handleWebhook(payload: string | Record<string, any>, signature?: string): Promise<WebhookEventResult>;
  createRefund(params: CreateRefundParams): Promise<RefundResult>;
}
