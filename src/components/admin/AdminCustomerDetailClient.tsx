"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Shield, Mail, Phone, Calendar, ShoppingBag, MapPin, AlertCircle, CheckCircle2, FileText, Ban, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { adminUpdateStatusAction } from "@/app/actions/auth";

interface CustomerDetailProps {
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: string;
    status: string;
    emailVerifiedAt: string | null;
    createdAt: string;
    updatedAt: string;
    ordersCount: number;
    totalSpend: number;
    addresses: Array<{
      id: string;
      recipientName: string;
      company?: string | null;
      addressLine1: string;
      addressLine2?: string | null;
      city: string;
      stateProvince: string;
      postalCode: string;
      countryCode: string;
      phone: string;
      isDefault: boolean;
    }>;
    orders: Array<{
      id: string;
      orderNumber: string;
      totalAmount: number;
      currency: string;
      orderStatus: string;
      paymentStatus: string;
      createdAt: string;
      itemsCount: number;
    }>;
  };
  canEdit: boolean;
}

export function AdminCustomerDetailClient({ customer, canEdit }: CustomerDetailProps) {
  const [currentStatus, setCurrentStatus] = useState(customer.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleStatusChange = async (newStatus: "active" | "suspended" | "disabled") => {
    setIsUpdating(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.set("userId", customer.id);
      formData.set("status", newStatus);

      const res = await adminUpdateStatusAction(null, formData);
      if (res.success) {
        setCurrentStatus(newStatus);
        setFeedback({ type: "success", text: `Client status updated to ${newStatus}.` });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update status." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error updating client status." });
    } finally {
      setIsUpdating(false);
    }
  };

  const averageOrderValue = customer.ordersCount > 0 ? customer.totalSpend / customer.ordersCount : 0;
  const lastOrder = customer.orders.length > 0 ? customer.orders[0] : null;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Back button & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Client Directory</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-light uppercase tracking-tight text-neutral-950">
              {customer.firstName || customer.lastName
                ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
                : "Unnamed Client"}
            </h1>
            <Badge
              variant={
                currentStatus === "active"
                  ? "success"
                  : currentStatus === "suspended"
                  ? "warning"
                  : "outline"
              }
              className="text-[10px] uppercase tracking-wider"
            >
              {currentStatus}
            </Badge>
            <Badge variant="neutral" className="text-[10px] uppercase tracking-wider">
              {customer.role}
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 font-mono mt-1">Client ID: {customer.id}</p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            {currentStatus === "active" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => handleStatusChange("suspended")}
                className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Suspend Account
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => handleStatusChange("active")}
                className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Reactivate Account
              </Button>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Lifetime Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light font-mono text-neutral-900">
              ${customer.totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">Calculated from verified orders</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Total Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light font-mono text-neutral-900">
              {customer.ordersCount}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">Lifetime acquisitions</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Average Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light font-mono text-neutral-900">
              ${averageOrderValue.toFixed(2)}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">Per commission transaction</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Member Since
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-neutral-900 mt-1">
              {new Date(customer.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {customer.emailVerifiedAt ? "Email verified" : "Unverified email"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Order History & Addresses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order History */}
          <Card className="rounded-none border-neutral-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5 text-neutral-400" />
                Commission History ({customer.orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  This client has not placed any commissions yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {customer.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/orders/${ord.id}`}
                            className="font-mono text-xs font-bold text-neutral-900 hover:underline"
                          >
                            {ord.orderNumber}
                          </Link>
                          <Badge variant="outline" className="text-[9px] uppercase">
                            {ord.orderStatus}
                          </Badge>
                          <Badge variant="neutral" className="text-[9px] uppercase">
                            {ord.paymentStatus}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {new Date(ord.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          • {ord.itemsCount} {ord.itemsCount === 1 ? "item" : "items"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 sm:justify-end">
                        <span className="text-xs font-mono font-medium text-neutral-900">
                          ${ord.totalAmount.toFixed(2)} {ord.currency}
                        </span>
                        <Link href={`/admin/orders/${ord.id}`}>
                          <Button variant="ghost" size="sm" className="text-[11px]">
                            Inspect
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Addresses */}
          <Card className="rounded-none border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                Delivery Destinations ({customer.addresses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.addresses.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  No saved destinations registered.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customer.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 border border-neutral-200 bg-neutral-50/50 text-xs text-neutral-600 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-900">{addr.recipientName}</span>
                        {addr.isDefault && (
                          <Badge variant="outline" className="text-[9px] uppercase">
                            Default
                          </Badge>
                        )}
                      </div>
                      {addr.company && <p className="text-neutral-500">{addr.company}</p>}
                      <p>{addr.addressLine1}</p>
                      {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                      <p>
                        {addr.city}, {addr.stateProvince} {addr.postalCode}
                      </p>
                      <p className="font-mono text-[11px] text-neutral-400">{addr.countryCode}</p>
                      {addr.phone && <p className="text-[11px] text-neutral-500 mt-1">Tel: {addr.phone}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Profile Information & Security State */}
        <div className="space-y-6">
          <Card className="rounded-none border-neutral-200">
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <span className="text-neutral-400 uppercase tracking-wider text-[10px] block">
                  Email Address
                </span>
                <span className="text-neutral-900 font-medium font-mono break-all">{customer.email}</span>
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  {customer.emailVerifiedAt ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified ({new Date(customer.emailVerifiedAt).toLocaleDateString()})
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Verification Pending
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-neutral-400 uppercase tracking-wider text-[10px] block">
                  Phone Number
                </span>
                <span className="text-neutral-900 font-mono">
                  {customer.phone || "Not recorded"}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 uppercase tracking-wider text-[10px] block">
                  Role & Classification
                </span>
                <span className="text-neutral-900 uppercase font-semibold text-[11px]">
                  {customer.role}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 uppercase tracking-wider text-[10px] block">
                  Registration Timestamp
                </span>
                <span className="text-neutral-700 font-mono text-[11px]">
                  {new Date(customer.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="pt-3 border-t border-neutral-100">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Credential hashes & tokens securely isolated.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
