import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { orderService } from "@/lib/orders/order-service";
import { shippingService } from "@/lib/shipping/shipping-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ShieldCheck, Clock, MapPin, Package, CreditCard, ShoppingBag, Truck, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface OrderDetailsProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailsPage({ params }: OrderDetailsProps) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);

  const order = await orderService.getOrderById(id);
  if (!order) {
    notFound();
  }

  // IDOR Protection: Enforce resource ownership server-side
  const isElevated = user.role === "admin" || user.role === "owner";
  const isOwner = order.userId === user.id || order.customerEmail === user.email;

  if (!isOwner && !isElevated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="p-8 bg-neutral-50 border border-neutral-200">
          <h1 className="text-xl font-light uppercase tracking-wider text-neutral-900">
            Access Restricted (403 Forbidden)
          </h1>
          <p className="mt-2 text-xs text-neutral-500">
            Insecure Direct Object Reference (IDOR) protection: You are not authorized
            to inspect commissions or orders belonging to another client.
          </p>
          <div className="mt-6">
            <Link href="/account">
              <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider">
                Return to Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const shippingAddr = order.shippingAddressSnapshot || {};
  const shipments = await shippingService.getShipmentsByOrderId(order.id);

  // Derive fulfillment steps
  const isDelivered = order.fulfillmentStatus === "delivered" || order.orderStatus === "completed";
  const isShipped = order.fulfillmentStatus === "shipped" || isDelivered;
  const isProcessing = order.orderStatus === "processing" || isShipped;
  const isConfirmed = order.orderStatus !== "cancelled";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/account"
          className="text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Client Account
        </Link>
      </div>

      <div className="border-b border-neutral-200 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-light tracking-tight text-neutral-950 font-mono">
              {order.orderNumber}
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase">
              {order.orderStatus}
            </Badge>
            <Badge variant="neutral" className="text-[10px] uppercase">
              {order.paymentStatus}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase">
              {order.fulfillmentStatus}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-neutral-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Placed on {new Date(order.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] flex items-center gap-1 text-emerald-700 bg-emerald-50/50">
            <ShieldCheck className="w-3 h-3" />
            Authenticity & Ownership Verified
          </Badge>
        </div>
      </div>

      {/* FULFILLMENT TIMELINE */}
      <Card className="rounded-none border-neutral-200 mb-8 bg-neutral-50/40">
        <CardHeader className="pb-4 border-b border-neutral-200">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
            <Truck className="h-4 w-4 text-neutral-400" />
            Fulfillment & Tracking Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
            {/* Step 1: Confirmed */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                isConfirmed ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
              }`}>
                ✓
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-900">Commission Placed</p>
                <p className="text-[11px] text-neutral-500">Order authorized</p>
              </div>
            </div>

            {/* Step 2: Processing */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                isProcessing ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
              }`}>
                2
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-900">Atelier Crafting</p>
                <p className="text-[11px] text-neutral-500">Inspection & packaging</p>
              </div>
            </div>

            {/* Step 3: Dispatched */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                isShipped ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
              }`}>
                3
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-900">In Transit</p>
                <p className="text-[11px] text-neutral-500">With carrier partner</p>
              </div>
            </div>

            {/* Step 4: Delivered */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                isDelivered ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-500"
              }`}>
                4
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-900">Delivered</p>
                <p className="text-[11px] text-neutral-500">To client destination</p>
              </div>
            </div>
          </div>

          {/* Active Shipments Details */}
          {shipments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-neutral-200 space-y-3">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-700 block">
                Active Tracking Numbers
              </span>
              <div className="space-y-2">
                {shipments.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-white border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-neutral-900 uppercase tracking-wider">{s.carrier}</span>
                      <span className="text-neutral-400 mx-2">•</span>
                      <span className="font-mono text-neutral-700 font-medium">Tracking: {s.trackingNumber}</span>
                      <Badge variant="outline" className="ml-2 text-[9px] uppercase">
                        {s.status}
                      </Badge>
                    </div>

                    {s.trackingUrl && (
                      <a
                        href={s.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-900 hover:underline"
                      >
                        Track with Carrier <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: Items List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-none border-neutral-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase tracking-wider">
                Acquired Silhouettes ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-neutral-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.productTitle}
                          fill
                          sizes="56px"
                          referrerPolicy="no-referrer"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-400">
                          <ShoppingBag className="h-5 w-5 stroke-1" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-900">{item.productTitle}</h3>
                      <p className="text-xs text-neutral-400 font-mono mt-0.5">
                        {item.variantTitle} • SKU: {item.sku}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-medium text-neutral-900">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Delivery & Payment Snapshots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="rounded-none border-neutral-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  Delivery Destination
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-neutral-600 space-y-0.5">
                <p className="font-semibold text-neutral-900">{shippingAddr.recipientName}</p>
                {shippingAddr.company && <p>{shippingAddr.company}</p>}
                <p>{shippingAddr.addressLine1}</p>
                {shippingAddr.addressLine2 && <p>{shippingAddr.addressLine2}</p>}
                <p>
                  {shippingAddr.city}, {shippingAddr.stateProvince} {shippingAddr.postalCode}
                </p>
                <p className="font-mono text-neutral-400">{shippingAddr.countryCode}</p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-neutral-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                  Payment & Service
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-neutral-600 space-y-1">
                <p className="font-medium text-neutral-900">
                  {order.shippingMethodSnapshot?.name || "Standard Atelier Delivery"}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {order.shippingMethodSnapshot?.estimatedDays}
                </p>
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="capitalize">{order.paymentMethodSnapshot?.type || "Card"}</span>
                  <Badge variant="outline" className="text-[9px] uppercase">
                    {order.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT: Financial Breakdown */}
        <div className="space-y-6">
          <Card className="rounded-none border-neutral-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase tracking-wider">
                Commission Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-mono text-neutral-900">
                  ${order.subtotalAmount.toFixed(2)}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount ({order.appliedCouponCode})</span>
                  <span className="font-mono">-${order.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Shipping ({order.shippingMethodSnapshot?.name || "Delivery"})</span>
                <span className="font-mono text-neutral-900">
                  {order.shippingAmount === 0 ? "Complimentary" : `$${order.shippingAmount.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Estimated Sales Tax</span>
                <span className="font-mono text-neutral-900">
                  ${order.taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-neutral-200 pt-3 flex justify-between font-medium text-sm text-neutral-950">
                <span>Total Amount</span>
                <span className="font-mono">
                  ${order.totalAmount.toFixed(2)} {order.currency}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
