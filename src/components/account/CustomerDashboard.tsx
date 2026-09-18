"use client";

import { useState } from "react";
import { SessionUser, UserAddress } from "@/types";
import { ProtectedOrderSummary } from "@/lib/auth/user-store";
import {
  logoutAction,
  updateProfileAction,
  changePasswordAction,
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  ActionState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  User,
  Package,
  MapPin,
  Lock,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  Star,
  X,
  Heart,
} from "lucide-react";
import Link from "next/link";

interface CustomerDashboardProps {
  user: SessionUser;
  orders: ProtectedOrderSummary[];
  addresses: UserAddress[];
}

export function CustomerDashboard({ user, orders, addresses }: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "addresses" | "security">("overview");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileState, setProfileState] = useState<ActionState | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordState, setPasswordState] = useState<ActionState | null>(null);

  // Address management state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressState, setAddressState] = useState<ActionState | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const handleCreateAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddressLoading(true);
    setAddressState(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await createAddressAction(null, formData);
    setAddressState(res);
    setAddressLoading(false);
    if (res.success) {
      form.reset();
      setIsAddingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    let confirmed = true;
    try {
      confirmed = window.confirm("Are you sure you wish to delete this delivery destination?");
    } catch {
      confirmed = true;
    }
    if (!confirmed) return;
    setActionInProgressId(addressId);
    setAddressState(null);
    const res = await deleteAddressAction(addressId);
    setAddressState(res);
    setActionInProgressId(null);
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    setActionInProgressId(addressId);
    setAddressState(null);
    const res = await setDefaultAddressAction(addressId);
    setAddressState(res);
    setActionInProgressId(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileState(null);
    const formData = new FormData(e.currentTarget);
    const res = await updateProfileAction(null, formData);
    setProfileState(res);
    setProfileLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordState(null);
    const formData = new FormData(e.currentTarget);
    const res = await changePasswordAction(null, formData);
    setPasswordState(res);
    setPasswordLoading(false);
  };

  const isStaffOrAdmin =
    user.role === "owner" || user.role === "admin" || user.role === "staff";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Profile Bar */}
      <div className="border-b border-neutral-200 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-light tracking-tight uppercase text-neutral-950">
              {user.firstName} {user.lastName}
            </h1>
            <Badge variant="outline" className="text-[10px] tracking-wider uppercase">
              {user.role}
            </Badge>
            <Badge
              variant={user.status === "active" ? "neutral" : "danger"}
              className="text-[10px] uppercase"
            >
              {user.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-neutral-500 font-mono">{user.email}</p>
        </div>

        <div className="flex items-center gap-3">
          {isStaffOrAdmin && (
            <Link href="/admin">
              <Button size="sm" className="text-xs uppercase tracking-wider bg-neutral-950 text-white hover:bg-neutral-800 border border-neutral-700 shadow-sm flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Admin Console
              </Button>
            </Link>
          )}

          <form action={() => logoutAction("/account")}>
            <Button
              id="account-logout-btn"
              type="submit"
              variant="outline"
              size="sm"
              className="text-xs uppercase tracking-wider text-neutral-600 hover:text-neutral-950"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out
            </Button>
          </form>
        </div>
      </div>

      {/* Admin / Owner Quick Action Banner */}
      {isStaffOrAdmin && (
        <div className="mb-8 p-4 sm:p-5 bg-neutral-950 text-white border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-xs uppercase tracking-widest font-bold text-amber-400">
                Store Administration ({user.role.toUpperCase()})
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-300">
              You are signed in as an administrator. You can add products, manage catalog variants, adjust stock levels, and fulfill orders.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/admin/products/new">
              <Button size="sm" className="bg-amber-400 text-neutral-950 hover:bg-amber-300 font-semibold text-xs tracking-wider uppercase">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Product
              </Button>
            </Link>
            <Link href="/admin/products">
              <Button size="sm" variant="outline" className="text-xs text-white border-neutral-700 hover:bg-neutral-800 uppercase tracking-wider">
                <Package className="w-3.5 h-3.5 mr-1" />
                All Products
              </Button>
            </Link>
            <Link href="/admin">
              <Button size="sm" variant="outline" className="text-xs text-white border-neutral-700 hover:bg-neutral-800 uppercase tracking-wider">
                Console Dashboard
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 mb-8 overflow-x-auto" role="tablist">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-4 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 px-4 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "orders"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("addresses")}
          className={`pb-3 px-4 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "addresses"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Addresses ({addresses.length})
        </button>
        <Link
          href="/account/wishlist"
          className="pb-3 px-4 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 border-transparent text-neutral-400 hover:text-neutral-700 whitespace-nowrap flex items-center gap-2"
        >
          <Heart className="w-3.5 h-3.5" />
          Curated Wishlist
        </Link>
        <button
          onClick={() => setActiveTab("security")}
          className={`pb-3 px-4 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "security"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          Security & Profile
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-none border-neutral-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-neutral-500">
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light text-neutral-900">{orders.length}</div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Lifetime acquisitions with Atelier
                </p>
              </CardContent>
            </Card>

            <Link href="/account/addresses" className="block group">
              <Card className="rounded-none border-neutral-200 group-hover:border-neutral-400 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                    <span>Saved Addresses</span>
                    <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light text-neutral-900">{addresses.length}</div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Manage delivery destinations
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/account/wishlist" className="block group">
              <Card className="rounded-none border-neutral-200 group-hover:border-neutral-400 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                    <span>Curated Wishlist</span>
                    <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Heart className="w-6 h-6 text-neutral-900 stroke-1" />
                    <span className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
                      View Saved
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Private footwear shortlist
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Card className="rounded-none border-neutral-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-neutral-500">
                  Authentication Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-base font-medium uppercase tracking-wider text-neutral-900">
                  {user.role} Tier
                </div>
                <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Secure session verified
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders Overview */}
          <Card className="rounded-none border-neutral-200">
            <CardHeader>
              <CardTitle className="text-base font-light tracking-wide uppercase">
                Recent Commission History
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Track status and delivery details for your bespoke footwear and apparel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4">No recent orders recorded.</p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {orders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      className="py-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-neutral-900">
                            {order.orderNumber}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {order.orderStatus}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-mono font-medium text-neutral-900">
                            ${order.totalAmount.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {order.itemsCount} item{order.itemsCount > 1 ? "s" : ""}
                          </div>
                        </div>

                        <Link href={`/account/orders/${order.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            View <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <Card className="rounded-none border-neutral-200">
          <CardHeader>
            <CardTitle className="text-base font-light tracking-wide uppercase">
              Order Ledger
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Orders are protected by server-side authorization and strict IDOR controls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">No orders found.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {orders.map((order) => (
                  <div key={order.id} className="py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-neutral-950">
                            {order.orderNumber}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {order.orderStatus}
                          </Badge>
                          <Badge variant="neutral" className="text-[10px] uppercase">
                            {order.paymentStatus}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">
                          Placed on {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-mono font-medium text-neutral-900">
                            ${order.totalAmount.toFixed(2)} {order.currency}
                          </div>
                          <div className="text-xs text-neutral-400">{order.itemsCount} item(s)</div>
                        </div>

                        <Link href={`/account/orders/${order.id}`}>
                          <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider">
                            Order Details
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs text-neutral-600"
                        >
                          <span>
                            {item.title}{" "}
                            <span className="text-neutral-400">× {item.quantity}</span>
                          </span>
                          <span className="font-mono text-neutral-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ADDRESSES TAB */}
      {activeTab === "addresses" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-light tracking-wide uppercase text-neutral-950">
                Address Book
              </h2>
              <p className="text-xs text-neutral-500">
                Manage your saved delivery destinations and billing preferences.
              </p>
            </div>
            <Button
              id="toggle-add-address-btn"
              onClick={() => {
                setIsAddingAddress(!isAddingAddress);
                setAddressState(null);
              }}
              variant="outline"
              size="sm"
              className="text-xs uppercase tracking-wider self-start sm:self-auto"
            >
              {isAddingAddress ? (
                <>
                  <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add New Address
                </>
              )}
            </Button>
          </div>

          {/* Address Action Feedback */}
          {addressState?.error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{addressState.error}</span>
            </div>
          )}
          {addressState?.success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{addressState.message}</span>
            </div>
          )}

          {/* ADD ADDRESS FORM */}
          {isAddingAddress && (
            <Card className="rounded-none border-neutral-900 shadow-sm bg-neutral-50/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium uppercase tracking-wider">
                  New Delivery Destination
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Provide full shipping information for expedited checkout.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAddress} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      id="addr-recipient"
                      name="recipientName"
                      label="Recipient Full Name"
                      placeholder="e.g. Jane Doe"
                      required
                    />
                    <Input
                      id="addr-company"
                      name="company"
                      label="Company / Care Of (Optional)"
                      placeholder="e.g. Studio 4B"
                    />
                  </div>

                  <Input
                    id="addr-line1"
                    name="addressLine1"
                    label="Street Address"
                    placeholder="123 Madison Ave, Suite 400"
                    required
                  />

                  <Input
                    id="addr-line2"
                    name="addressLine2"
                    label="Apartment, Suite, Unit (Optional)"
                    placeholder="Apt 4B"
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <Input
                        id="addr-city"
                        name="city"
                        label="City"
                        placeholder="New York"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        id="addr-state"
                        name="stateProvince"
                        label="State / Province"
                        placeholder="NY"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        id="addr-postal"
                        name="postalCode"
                        label="Postal Code"
                        placeholder="10016"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        id="addr-country"
                        name="countryCode"
                        label="Country (ISO-2)"
                        defaultValue="US"
                        placeholder="US"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <Input
                      id="addr-phone"
                      name="phone"
                      type="tel"
                      label="Contact Phone"
                      placeholder="+1 (555) 000-0000"
                      required
                    />
                    <div className="flex items-center space-x-2 pt-5">
                      <input
                        id="addr-default"
                        name="isDefault"
                        type="checkbox"
                        className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
                      />
                      <label htmlFor="addr-default" className="text-xs text-neutral-700 select-none">
                        Set as primary default destination
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingAddress(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      id="save-address-submit-btn"
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={addressLoading}
                      className="text-xs uppercase tracking-wider"
                    >
                      {addressLoading ? "Saving..." : "Save Address"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ADDRESS LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.length === 0 ? (
              <div className="col-span-2 py-12 text-center border border-dashed border-neutral-200">
                <MapPin className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-neutral-600">No Saved Destinations</p>
                <p className="text-[11px] text-neutral-400 mt-1 max-w-sm mx-auto">
                  Add delivery addresses to your client address book for one-click checkout on future acquisitions.
                </p>
              </div>
            ) : (
              addresses.map((addr) => (
                <Card key={addr.id} className="rounded-none border-neutral-200 flex flex-col justify-between">
                  <div>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium text-neutral-950">
                        {addr.recipientName}
                      </CardTitle>
                      {addr.isDefault ? (
                        <Badge variant="neutral" className="text-[10px] uppercase font-mono">
                          Primary Default
                        </Badge>
                      ) : null}
                    </CardHeader>
                    <CardContent className="text-xs text-neutral-600 space-y-1">
                      {addr.company && <p className="font-medium text-neutral-800">{addr.company}</p>}
                      <p>{addr.addressLine1}</p>
                      {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                      <p>
                        {addr.city}, {addr.stateProvince} {addr.postalCode}
                      </p>
                      <p className="font-mono text-neutral-500">{addr.countryCode}</p>
                      <p className="text-neutral-400 pt-1 font-mono">{addr.phone}</p>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0 border-t border-neutral-100 mt-4 flex items-center justify-between text-xs">
                    {!addr.isDefault ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        disabled={actionInProgressId === addr.id}
                        className="text-neutral-500 hover:text-neutral-950 inline-flex items-center gap-1 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Set as Default</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-neutral-400">Default for deliveries</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      disabled={actionInProgressId === addr.id}
                      className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECURITY & PROFILE TAB */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* PROFILE EDIT FORM */}
          <Card className="rounded-none border-neutral-200">
            <CardHeader>
              <CardTitle className="text-base font-light tracking-wide uppercase">
                Personal Identification
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Update your concierge contact details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileState?.error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {profileState.error}
                </div>
              )}
              {profileState?.success && (
                <div className="mb-4 p-3 bg-neutral-900 text-white text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {profileState.message}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <Input
                  id="profile-first-name"
                  name="firstName"
                  label="First Name"
                  defaultValue={user.firstName}
                  required
                />
                <Input
                  id="profile-last-name"
                  name="lastName"
                  label="Last Name"
                  defaultValue={user.lastName}
                  required
                />
                <Input
                  id="profile-phone"
                  name="phone"
                  label="Phone Number"
                  defaultValue={""}
                  placeholder="+1 555-0193"
                />

                <Button
                  id="profile-save-btn"
                  type="submit"
                  variant="primary"
                  className="w-full text-xs uppercase tracking-wider"
                  disabled={profileLoading}
                >
                  {profileLoading ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* PASSWORD CHANGE FORM */}
          <Card className="rounded-none border-neutral-200">
            <CardHeader>
              <CardTitle className="text-base font-light tracking-wide uppercase">
                Change Password
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Requires validation of your current credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordState?.error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {passwordState.error}
                </div>
              )}
              {passwordState?.success && (
                <div className="mb-4 p-3 bg-neutral-900 text-white text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {passwordState.message}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <Input
                  id="password-current"
                  name="currentPassword"
                  type="password"
                  label="Current Password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <Input
                  id="password-new"
                  name="newPassword"
                  type="password"
                  label="New Password"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <Input
                  id="password-confirm"
                  name="confirmNewPassword"
                  type="password"
                  label="Confirm New Password"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />

                <Button
                  id="password-save-btn"
                  type="submit"
                  variant="primary"
                  className="w-full text-xs uppercase tracking-wider"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
