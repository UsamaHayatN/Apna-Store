import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { orderService } from "@/lib/orders/order-service";
import { getSessionUser } from "@/lib/auth/session";
import { siteConfig } from "@/config/site";
import {
  CheckCircle2,
  Package,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Commission Confirmed | Atelier",
  description: "Your acquisition commission has been authorized and queued for handcrafted preparation.",
};

interface SuccessPageProps {
  searchParams: Promise<{ orderNumber?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const { orderNumber } = await searchParams;

  if (!orderNumber) {
    notFound();
  }

  const order = await orderService.getOrderByNumber(orderNumber);

  if (!order) {
    notFound();
  }

  const user = await getSessionUser();
  const formatPrice = (val: number) => `${siteConfig.currency.symbol}${val.toFixed(2)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="border border-neutral-200 bg-white p-8 sm:p-12 text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mb-6">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <span className="block text-[11px] font-bold uppercase tracking-widest text-emerald-800 mb-2">
          Commission Authorized & Recorded
        </span>
        <h1 className="text-3xl sm:text-4xl font-light uppercase tracking-tight text-neutral-950">
          Thank You For Your Acquisition
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-neutral-600 font-light max-w-md mx-auto leading-relaxed">
          Order reference <span className="font-mono font-bold text-neutral-950">{order.orderNumber}</span> has been dispatched to our master artisans. A comprehensive confirmation has been sent to{" "}
          <span className="font-medium text-neutral-900">{order.customerEmail}</span>.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <Link href={`/account/orders/${order.id}`}>
              <Button className="bg-neutral-950 text-white text-xs uppercase tracking-wider hover:bg-neutral-800">
                Track in Account Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/account">
              <Button variant="outline" className="text-xs uppercase tracking-wider">
                Create Account to Track
              </Button>
            </Link>
          )}

          <Link href="/shop">
            <Button variant="outline" className="text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>Continue Exploring Catalog</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Delivery Details Card */}
        <div className="border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
            <MapPin className="h-4 w-4 text-neutral-500" />
            <span>Delivery Destination</span>
          </div>
          <div className="text-xs text-neutral-600 space-y-1">
            <p className="font-semibold text-neutral-900">
              {order.shippingAddressSnapshot.recipientName}
            </p>
            {order.shippingAddressSnapshot.company && (
              <p>{order.shippingAddressSnapshot.company}</p>
            )}
            <p>{order.shippingAddressSnapshot.addressLine1}</p>
            {order.shippingAddressSnapshot.addressLine2 && (
              <p>{order.shippingAddressSnapshot.addressLine2}</p>
            )}
            <p>
              {order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.stateProvince}{" "}
              {order.shippingAddressSnapshot.postalCode}
            </p>
            <p className="font-mono text-neutral-400">
              {order.shippingAddressSnapshot.countryCode}
            </p>
          </div>
        </div>

        {/* Shipping Method Card */}
        <div className="border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
            <Package className="h-4 w-4 text-neutral-500" />
            <span>Fulfillment Service</span>
          </div>
          <div className="text-xs text-neutral-600 space-y-1">
            <p className="font-semibold text-neutral-900">
              {order.shippingMethodSnapshot?.name || "Standard Atelier Delivery"}
            </p>
            <p className="text-[11px] text-neutral-500">
              {order.shippingMethodSnapshot?.estimatedDays || "3-5 business days"}
            </p>
            <p className="pt-2 text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Hand-inspected with certificate
            </p>
          </div>
        </div>

        {/* Payment Details Card */}
        <div className="border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
            <Clock className="h-4 w-4 text-neutral-500" />
            <span>Payment Status</span>
          </div>
          <div className="text-xs text-neutral-600 space-y-1">
            <p className="font-semibold text-neutral-900 uppercase">
              {order.paymentStatus} • {order.paymentMethodSnapshot?.type || "Card"}
            </p>
            {order.paymentMethodSnapshot?.last4 && (
              <p className="font-mono text-neutral-500">
                Ending in •••• {order.paymentMethodSnapshot.last4}
              </p>
            )}
            <p className="text-neutral-400 text-[11px] pt-1">
              Authorized on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Itemized Products */}
      <div className="border border-neutral-200 bg-white p-6 sm:p-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 pb-4 border-b border-neutral-100 mb-4 flex items-center justify-between">
          <span>Acquired Footwear ({order.items.length})</span>
          <span className="font-mono text-neutral-500 text-xs">{order.orderNumber}</span>
        </h2>

        <div className="divide-y divide-neutral-100">
          {order.items.map((item) => (
            <div key={item.id} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.productTitle}
                      fill
                      sizes="64px"
                      referrerPolicy="no-referrer"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400">
                      <ShoppingBag className="h-6 w-6 stroke-1" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-neutral-950">
                    {item.productTitle}
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {item.variantTitle} • SKU: <span className="font-mono">{item.sku}</span>
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Quantity: {item.quantity} × {formatPrice(item.unitPrice)}
                  </p>
                </div>
              </div>

              <div className="text-right font-mono font-bold text-xs sm:text-sm text-neutral-950">
                {formatPrice(item.totalPrice)}
              </div>
            </div>
          ))}
        </div>

        {/* Totals Summary */}
        <div className="border-t border-neutral-200 mt-6 pt-6 space-y-2 max-w-xs ml-auto text-xs">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span className="font-mono text-neutral-900">{formatPrice(order.subtotalAmount)}</span>
          </div>

          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Promotional Voucher</span>
              <span className="font-mono">-{formatPrice(order.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-neutral-600">
            <span>Shipping</span>
            <span className="font-mono text-neutral-900">
              {order.shippingAmount === 0 ? "Complimentary" : formatPrice(order.shippingAmount)}
            </span>
          </div>

          <div className="flex justify-between text-neutral-600">
            <span>Estimated Sales Tax</span>
            <span className="font-mono text-neutral-900">{formatPrice(order.taxAmount)}</span>
          </div>

          <div className="border-t border-neutral-200 pt-3 flex justify-between font-bold text-sm text-neutral-950">
            <span>Total Remittance</span>
            <span className="font-mono text-base">{formatPrice(order.totalAmount)} {order.currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
