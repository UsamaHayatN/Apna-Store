import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payments/payment-service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("stripe-signature") ||
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-signature") ||
      undefined;

    const result = await paymentService.handleWebhook(rawBody, signature);

    return NextResponse.json({
      received: true,
      handled: result.handled,
      eventType: result.eventType,
      orderId: result.orderId,
      status: result.paymentStatus,
    });
  } catch (err: any) {
    console.error("Payment webhook handling error:", err);
    return NextResponse.json(
      { error: err.message || "Webhook processing error" },
      { status: 400 }
    );
  }
}
