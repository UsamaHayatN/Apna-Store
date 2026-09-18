"use client";

import { useState } from "react";
import { Plus, Tag, Copy, Check, Trash2, ShieldCheck, Percent, DollarSign, Calendar, X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CouponRecord } from "@/lib/coupons/coupon-service";
import {
  createAdminCouponAction,
  toggleAdminCouponAction,
  deleteAdminCouponAction,
} from "@/app/actions/coupons";

interface AdminCouponsClientProps {
  initialCoupons: CouponRecord[];
}

export function AdminCouponsClient({ initialCoupons }: AdminCouponsClientProps) {
  const [coupons, setCoupons] = useState<CouponRecord[]>(initialCoupons);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  // Form State
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed">("percentage");
  const [formValue, setFormValue] = useState("");
  const [formMinOrder, setFormMinOrder] = useState("");
  const [formDays, setFormDays] = useState("90");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggle = async (coupon: CouponRecord) => {
    setLoadingId(coupon.id);
    const newStatus = !coupon.isActive;
    const res = await toggleAdminCouponAction(coupon.id, newStatus);
    if (res.success) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: newStatus } : c))
      );
    }
    setLoadingId(null);
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm("Are you sure you want to revoke and delete this promotional coupon?")) {
      return;
    }
    setLoadingId(couponId);
    const res = await deleteAdminCouponAction(couponId);
    if (res.success) {
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    }
    setLoadingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const val = parseFloat(formValue);
    if (isNaN(val) || val <= 0) {
      setFormError("Please provide a positive numerical value.");
      return;
    }

    setIsSubmitting(true);
    const res = await createAdminCouponAction({
      code: formCode,
      description: formDescription,
      discountType: formType,
      discountValue: val,
      minimumOrderAmount: formMinOrder ? parseFloat(formMinOrder) : 0,
      expiresInDays: parseInt(formDays, 10) || 90,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || "Failed to create coupon.");
      return;
    }

    if (res.coupon) {
      setCoupons((prev) => [res.coupon!, ...prev]);
    }

    setIsModalOpen(false);
    setFormCode("");
    setFormDescription("");
    setFormValue("");
    setFormMinOrder("");
  };

  const filteredCoupons = coupons.filter((c) => {
    if (filter === "active") return c.isActive;
    if (filter === "inactive") return !c.isActive;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Promotions & Incentives
          </span>
          <h1 className="mt-1 text-2xl font-light uppercase tracking-tight text-neutral-950">
            Promotional Coupons & Privileges
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            id="admin-create-coupon-btn"
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            <span>Create Coupon</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-neutral-100 p-1 border border-neutral-200 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              filter === "all"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            All ({coupons.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              filter === "active"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Active ({coupons.filter((c) => c.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("inactive")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              filter === "inactive"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Inactive ({coupons.filter((c) => !c.isActive).length})
          </button>
        </div>

        <div className="text-xs text-neutral-500 hidden sm:block">
          Coupons apply automatically during client checkout.
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-neutral-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min. Order</TableHead>
              <TableHead>Redemptions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCoupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-neutral-400 text-xs">
                  No promotional vouchers found matching current filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold tracking-wider text-neutral-950">
                        {coupon.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(coupon.code)}
                        className="text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs text-xs text-neutral-600 truncate">
                    {coupon.description || "General promotional deduction"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-mono text-xs font-semibold text-neutral-900">
                      {coupon.discountType === "percentage" ? (
                        <>
                          <Percent className="h-3 w-3 text-neutral-400" />
                          <span>{coupon.discountValue}% OFF</span>
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-3 w-3 text-neutral-400" />
                          <span>${coupon.discountValue.toFixed(2)} OFF</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-neutral-600">
                    {coupon.minimumOrderAmount > 0 ? (
                      `$${coupon.minimumOrderAmount.toFixed(2)}`
                    ) : (
                      <span className="text-neutral-400">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-neutral-600">
                    {coupon.timesUsed}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      disabled={loadingId === coupon.id}
                      onClick={() => handleToggle(coupon)}
                      className="cursor-pointer"
                    >
                      {coupon.isActive ? (
                        <Badge variant="success" className="cursor-pointer">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="cursor-pointer text-neutral-400">
                          Inactive
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingId === coupon.id}
                        onClick={() => handleToggle(coupon)}
                        className="text-[11px]"
                      >
                        {coupon.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <button
                        type="button"
                        disabled={loadingId === coupon.id}
                        onClick={() => handleDelete(coupon.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                        title="Delete coupon"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-neutral-700" />
                <h2 className="text-base font-medium uppercase tracking-wider text-neutral-950">
                  Create Promotional Voucher
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Coupon Code
                </label>
                <Input
                  id="coupon-form-code"
                  placeholder="e.g. SUMMER25"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  required
                  className="font-mono uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Description / Client Note
                </label>
                <Input
                  id="coupon-form-desc"
                  placeholder="e.g. Exclusive 20% privilege deduction for VIP collectors"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    id="coupon-form-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    {formType === "percentage" ? "Percentage Value (%)" : "Fixed Value ($)"}
                  </label>
                  <Input
                    id="coupon-form-val"
                    type="number"
                    step="0.01"
                    placeholder={formType === "percentage" ? "15" : "50.00"}
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Min Order Subtotal ($)
                  </label>
                  <Input
                    id="coupon-form-min"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Validity Period
                  </label>
                  <select
                    id="coupon-form-days"
                    value={formDays}
                    onChange={(e) => setFormDays(e.target.value)}
                    className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
                  >
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                    <option value="365">1 Year</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Generating..." : "Issue Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
