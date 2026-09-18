"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  CreditCard,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  X,
  Package,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { OrderRecord } from "@/lib/orders/order-service";
import { PaymentRecord, PaymentRefundRecord } from "@/lib/payments/types";
import { ShipmentRecord, ShipmentStatus } from "@/lib/shipping/types";
import {
  adminUpdateOrderStatusAction,
  adminCreateShipmentAction,
  adminUpdateShipmentStatusAction,
  adminIssueRefundAction,
} from "@/app/actions/orders";

interface AdminOrderDetailClientProps {
  order: OrderRecord;
  payment: PaymentRecord | null;
  refunds: PaymentRefundRecord[];
  shipments: ShipmentRecord[];
  canEdit: boolean;
}

export function AdminOrderDetailClient({
  order: initialOrder,
  payment: initialPayment,
  refunds: initialRefunds,
  shipments: initialShipments,
  canEdit,
}: AdminOrderDetailClientProps) {
  const [order, setOrder] = useState<OrderRecord>(initialOrder);
  const [payment, setPayment] = useState<PaymentRecord | null>(initialPayment);
  const [refunds, setRefunds] = useState<PaymentRefundRecord[]>(initialRefunds);
  const [shipments, setShipments] = useState<ShipmentRecord[]>(initialShipments);

  // Modals
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Action status
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states: Shipment
  const [shipCarrier, setShipCarrier] = useState("FedEx");
  const [shipTrackingNumber, setShipTrackingNumber] = useState("");
  const [shipServiceName, setShipServiceName] = useState("Priority Express");
  const [shipNotes, setShipNotes] = useState("");

  // Form states: Refund
  const [refundAmount, setRefundAmount] = useState(order.totalAmount.toString());
  const [refundReason, setRefundReason] = useState("Client requested return");

  // Form states: Status
  const [selectedOrderStatus, setSelectedOrderStatus] = useState(order.orderStatus);
  const [statusNotes, setStatusNotes] = useState("");

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const res = await adminUpdateOrderStatusAction(order.id, selectedOrderStatus, statusNotes);
    setLoading(false);

    if (res.success) {
      setOrder((prev) => ({ ...prev, orderStatus: selectedOrderStatus }));
      setIsStatusModalOpen(false);
      setFeedback({ type: "success", text: res.message || "Order status updated." });
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to update order status." });
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const res = await adminCreateShipmentAction(order.id, {
      carrier: shipCarrier,
      trackingNumber: shipTrackingNumber,
      serviceName: shipServiceName,
      notes: shipNotes,
    });
    setLoading(false);

    if (res.success) {
      const newShipment: ShipmentRecord = {
        id: `ship-${Date.now()}`,
        orderId: order.id,
        carrier: shipCarrier,
        serviceName: shipServiceName,
        trackingNumber: shipTrackingNumber,
        trackingUrl: null,
        status: "in_transit",
        shippingCost: 0,
        estimatedDeliveryDate: null,
        shippedAt: new Date().toISOString(),
        deliveredAt: null,
        notes: shipNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setShipments((prev) => [newShipment, ...prev]);
      setOrder((prev) => ({ ...prev, fulfillmentStatus: "shipped", orderStatus: "processing" }));
      setIsShipmentModalOpen(false);
      setShipTrackingNumber("");
      setShipNotes("");
      setFeedback({ type: "success", text: res.message || "Shipment created successfully." });
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to create shipment." });
    }
  };

  const handleUpdateShipmentStatus = async (shipmentId: string, newStatus: ShipmentStatus) => {
    setLoading(true);
    setFeedback(null);

    const res = await adminUpdateShipmentStatusAction(shipmentId, order.id, newStatus);
    setLoading(false);

    if (res.success) {
      setShipments((prev) =>
        prev.map((s) => (s.id === shipmentId ? { ...s, status: newStatus } : s))
      );
      if (newStatus === "delivered") {
        setOrder((prev) => ({ ...prev, fulfillmentStatus: "delivered", orderStatus: "completed" }));
      }
      setFeedback({ type: "success", text: res.message || "Shipment status updated." });
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to update shipment status." });
    }
  };

  const handleIssueRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const amountNum = parseFloat(refundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ type: "error", text: "Please enter a valid refund amount." });
      setLoading(false);
      return;
    }

    const res = await adminIssueRefundAction(order.id, amountNum, refundReason);
    setLoading(false);

    if (res.success) {
      const newRefund: PaymentRefundRecord = {
        id: `ref-${Date.now()}`,
        paymentId: payment?.id || "",
        orderId: order.id,
        amount: amountNum,
        currency: order.currency,
        reason: refundReason,
        status: "succeeded",
        createdAt: new Date().toISOString(),
      };
      setRefunds((prev) => [newRefund, ...prev]);

      const totalRefunded = refunds.reduce((s, r) => s + r.amount, 0) + amountNum;
      const isFull = totalRefunded >= order.totalAmount - 0.01;
      const nextPayStatus = isFull ? "refunded" : "partially_refunded";

      setOrder((prev) => ({
        ...prev,
        paymentStatus: nextPayStatus,
        orderStatus: isFull ? "cancelled" : prev.orderStatus,
      }));

      if (payment) {
        setPayment((prev) => prev ? { ...prev, status: nextPayStatus } : null);
      }

      setIsRefundModalOpen(false);
      setFeedback({ type: "success", text: res.message || "Refund issued successfully." });
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to process refund." });
    }
  };

  const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Navigation & Status Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Orders Ledger</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-light uppercase tracking-tight text-neutral-950 font-mono">
              {order.orderNumber}
            </h1>
            <Badge
              variant={
                order.orderStatus === "completed"
                  ? "success"
                  : order.orderStatus === "cancelled"
                  ? "danger"
                  : "outline"
              }
              className="text-[10px] uppercase tracking-wider"
            >
              {order.orderStatus}
            </Badge>
            <Badge
              variant={
                order.paymentStatus === "paid"
                  ? "success"
                  : order.paymentStatus === "refunded"
                  ? "danger"
                  : "warning"
              }
              className="text-[10px] uppercase tracking-wider"
            >
              Payment: {order.paymentStatus}
            </Badge>
            <Badge variant="neutral" className="text-[10px] uppercase tracking-wider">
              Fulfillment: {order.fulfillmentStatus}
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 font-mono mt-1">
            Placed on {new Date(order.createdAt).toLocaleString("en-US")}
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(true)}
              className="text-xs uppercase tracking-wider"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Update Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShipmentModalOpen(true)}
              className="text-xs uppercase tracking-wider"
            >
              <Truck className="mr-1.5 h-3.5 w-3.5" />
              Dispatch Shipment
            </Button>
            {order.paymentStatus === "paid" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRefundModalOpen(true)}
                className="text-xs text-red-700 border-red-200 hover:bg-red-50 uppercase tracking-wider"
              >
                Issue Refund
              </Button>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs border flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Order Items & Shipments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Card */}
          <Card className="rounded-none border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5 text-neutral-400" />
                Commission Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-neutral-100">
                {order.items.map((it) => (
                  <div key={it.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden">
                        {it.thumbnailUrl ? (
                          <Image
                            src={it.thumbnailUrl}
                            alt={it.productTitle}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-neutral-400 m-auto" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-900">{it.productTitle}</p>
                        <p className="text-[11px] text-neutral-500">{it.variantTitle}</p>
                        <p className="text-[10px] font-mono text-neutral-400">SKU: {it.sku}</p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <p className="text-neutral-900 font-medium">${it.totalPrice.toFixed(2)}</p>
                      <p className="text-[11px] text-neutral-400">
                        {it.quantity} × ${it.unitPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="pt-4 mt-4 border-t border-neutral-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span className="font-mono">${order.subtotalAmount.toFixed(2)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount {order.appliedCouponCode && `(${order.appliedCouponCode})`}</span>
                    <span className="font-mono">-${order.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-500">
                  <span>Delivery ({order.shippingMethodSnapshot.name})</span>
                  <span className="font-mono">
                    {order.shippingAmount === 0 ? "Complimentary" : `$${order.shippingAmount.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Estimated Tax</span>
                  <span className="font-mono">${order.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-neutral-950 pt-2 border-t border-neutral-100">
                  <span>Total Amount</span>
                  <span className="font-mono">
                    ${order.totalAmount.toFixed(2)} {order.currency}
                  </span>
                </div>
                {totalRefunded > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-mono pt-1">
                    <span>Refunded to Client</span>
                    <span>-${totalRefunded.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fulfillment & Shipments Card */}
          <Card className="rounded-none border-neutral-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-neutral-400" />
                Dispatched Shipments ({shipments.length})
              </CardTitle>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsShipmentModalOpen(true)}
                  className="text-xs uppercase"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Tracking
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {shipments.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No shipments dispatched yet for this commission.
                </div>
              ) : (
                <div className="space-y-4">
                  {shipments.map((ship) => (
                    <div
                      key={ship.id}
                      className="p-4 border border-neutral-200 bg-neutral-50/50 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-neutral-950 uppercase tracking-wider">
                              {ship.carrier}
                            </span>
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {ship.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                            Tracking: {ship.trackingNumber}
                          </p>
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1.5">
                            {ship.status !== "out_for_delivery" && ship.status !== "delivered" && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                onClick={() => handleUpdateShipmentStatus(ship.id, "out_for_delivery")}
                                className="text-[10px] uppercase"
                              >
                                Mark Out for Delivery
                              </Button>
                            )}
                            {ship.status !== "delivered" && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                onClick={() => handleUpdateShipmentStatus(ship.id, "delivered")}
                                className="text-[10px] uppercase text-emerald-700 hover:bg-emerald-50"
                              >
                                Mark Delivered
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {ship.serviceName && (
                        <p className="text-xs text-neutral-600">Service: {ship.serviceName}</p>
                      )}
                      {ship.notes && <p className="text-xs text-neutral-500 italic">{ship.notes}</p>}

                      <div className="text-[10px] font-mono text-neutral-400 flex items-center justify-between pt-2 border-t border-neutral-200">
                        <span>Dispatched: {new Date(ship.shippedAt || ship.createdAt).toLocaleString()}</span>
                        {ship.deliveredAt && (
                          <span className="text-emerald-600">
                            Delivered: {new Date(ship.deliveredAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Customer & Payment Dossier */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card className="rounded-none border-neutral-200">
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                Client & Destination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <span className="text-neutral-400 uppercase tracking-wider text-[10px] block">
                  Client Email
                </span>
                <span className="text-neutral-900 font-mono font-medium">{order.customerEmail}</span>
                {order.userId && (
                  <Link
                    href={`/admin/customers/${order.userId}`}
                    className="block text-[11px] text-neutral-500 hover:underline mt-0.5"
                  >
                    View Registered Client Profile →
                  </Link>
                )}
              </div>

              {order.customerPhone && (
                <div>
                  <span className="text-neutral-400 uppercase tracking-wider text-[10px] block">
                    Phone
                  </span>
                  <span className="text-neutral-900 font-mono">{order.customerPhone}</span>
                </div>
              )}

              <div className="pt-3 border-t border-neutral-100">
                <span className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1">
                  Shipping Destination
                </span>
                <div className="text-neutral-800 space-y-0.5">
                  <p className="font-semibold">{order.shippingAddressSnapshot.recipientName}</p>
                  {order.shippingAddressSnapshot.company && (
                    <p className="text-neutral-500">{order.shippingAddressSnapshot.company}</p>
                  )}
                  <p>{order.shippingAddressSnapshot.addressLine1}</p>
                  {order.shippingAddressSnapshot.addressLine2 && (
                    <p>{order.shippingAddressSnapshot.addressLine2}</p>
                  )}
                  <p>
                    {order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.stateProvince}{" "}
                    {order.shippingAddressSnapshot.postalCode}
                  </p>
                  <p className="font-mono text-neutral-400">{order.shippingAddressSnapshot.countryCode}</p>
                </div>
              </div>

              {order.customerNotes && (
                <div className="pt-3 border-t border-neutral-100">
                  <span className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1">
                    Special Instructions
                  </span>
                  <p className="p-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 italic">
                    "{order.customerNotes}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card className="rounded-none border-neutral-200">
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
                Payment Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <span className="text-neutral-400 uppercase tracking-wider text-[10px] block">
                  Method
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-medium text-neutral-900">
                    {order.paymentMethodSnapshot.brand || "Credit Card"} ••••{" "}
                    {order.paymentMethodSnapshot.last4 || "4242"}
                  </span>
                </div>
              </div>

              {payment && (
                <div>
                  <span className="text-neutral-400 uppercase tracking-wider text-[10px] block">
                    Gateway Transaction ID
                  </span>
                  <span className="font-mono text-[11px] text-neutral-600 break-all">
                    {payment.providerTransactionId}
                  </span>
                </div>
              )}

              {refunds.length > 0 && (
                <div className="pt-3 border-t border-neutral-100">
                  <span className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-2">
                    Refund History ({refunds.length})
                  </span>
                  <div className="space-y-2">
                    {refunds.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-2 bg-red-50/60 border border-red-200 text-[11px] text-red-900 space-y-0.5"
                      >
                        <div className="flex justify-between font-mono font-medium">
                          <span>Refund</span>
                          <span>-${ref.amount.toFixed(2)} {ref.currency}</span>
                        </div>
                        {ref.reason && <p className="text-neutral-600 italic">Reason: {ref.reason}</p>}
                        <p className="text-[10px] text-neutral-400 font-mono">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL: UPDATE STATUS */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Commission Status"
        description={`Modify operational status for ${order.orderNumber}`}
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateOrderStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Select Lifecycle Status
            </label>
            <select
              value={selectedOrderStatus}
              onChange={(e) => setSelectedOrderStatus(e.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
            >
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing (In Atelier)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Audit / Log Notes
            </label>
            <Input
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="e.g. Approved for bespoke crafting"
            />
          </div>

          <div className="pt-4 border-t border-neutral-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={loading}>
              Save Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DISPATCH SHIPMENT */}
      <Modal
        isOpen={isShipmentModalOpen}
        onClose={() => setIsShipmentModalOpen(false)}
        title="Dispatch Carrier Shipment"
        description="Assign carrier tracking to fulfill client commission"
        maxWidth="md"
      >
        <form onSubmit={handleCreateShipment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Carrier
              </label>
              <select
                value={shipCarrier}
                onChange={(e) => setShipCarrier(e.target.value)}
                className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
              >
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="DHL">DHL Express</option>
                <option value="USPS">USPS Priority</option>
                <option value="Atelier Courier">Atelier Courier</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Tracking Number
              </label>
              <Input
                required
                value={shipTrackingNumber}
                onChange={(e) => setShipTrackingNumber(e.target.value)}
                placeholder="e.g. 794612345678"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Service Tier
            </label>
            <Input
              value={shipServiceName}
              onChange={(e) => setShipServiceName(e.target.value)}
              placeholder="e.g. Priority Overnight / 2-Day Air"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Internal Dispatch Notes (Optional)
            </label>
            <Input
              value={shipNotes}
              onChange={(e) => setShipNotes(e.target.value)}
              placeholder="e.g. Double-boxed with cedar shoe trees"
            />
          </div>

          <div className="pt-4 border-t border-neutral-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsShipmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={loading}>
              Confirm Dispatch
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ISSUE REFUND */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Issue Financial Refund"
        description="Return authorized funds directly to client payment method"
        maxWidth="sm"
      >
        <form onSubmit={handleIssueRefund} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Refund Amount ($ USD)
            </label>
            <Input
              type="number"
              step="0.01"
              required
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              Max refundable: ${(order.totalAmount - totalRefunded).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Reason for Refund
            </label>
            <Input
              required
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Size exchange / Sizing return"
            />
          </div>

          <div className="pt-4 border-t border-neutral-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRefundModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="bg-red-700 hover:bg-red-800"
            >
              Issue Refund
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
