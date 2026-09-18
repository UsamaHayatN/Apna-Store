"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Star,
  Building,
  Phone,
  Check,
  X,
} from "lucide-react";
import { UserAddress } from "@/types";
import {
  createAddressAction,
  updateAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  ActionState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AddressesClientProps {
  addresses: UserAddress[];
  isGuest: boolean;
}

export function AddressesClient({ addresses: initialAddresses, isGuest }: AddressesClientProps) {
  const [addresses, setAddresses] = useState<UserAddress[]>(initialAddresses);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionState | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await createAddressAction(null, formData);
    setFeedback(res);
    setLoading(false);

    if (res.success) {
      form.reset();
      setIsAdding(false);
      window.location.reload();
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    const formData = new FormData(e.currentTarget);

    const res = await updateAddressAction(null, formData);
    setFeedback(res);
    setLoading(false);

    if (res.success) {
      setEditingAddress(null);
      window.location.reload();
    }
  };

  const handleDelete = async (addressId: string) => {
    let confirmed = true;
    try {
      confirmed = window.confirm("Are you sure you wish to remove this delivery destination?");
    } catch {
      confirmed = true;
    }
    if (!confirmed) return;

    setActionInProgressId(addressId);
    setFeedback(null);

    const res = await deleteAddressAction(addressId);
    setFeedback(res);
    setActionInProgressId(null);

    if (res.success) {
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setActionInProgressId(addressId);
    setFeedback(null);

    const res = await setDefaultAddressAction(addressId);
    setFeedback(res);
    setActionInProgressId(null);

    if (res.success) {
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === addressId,
          isDefaultShipping: a.id === addressId,
        }))
      );
    }
  };

  if (isGuest) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center max-w-md mx-auto">
          <MapPin className="mx-auto h-12 w-12 text-neutral-400 stroke-1 mb-4" />
          <h1 className="text-2xl font-light uppercase tracking-tight text-neutral-950">
            Delivery Addresses
          </h1>
          <p className="mt-2 text-xs text-neutral-600 leading-relaxed font-light">
            Sign in to your client account to manage saved shipping destinations and billing credentials.
          </p>
          <div className="mt-6">
            <Link
              href="/account?redirect=/account/addresses"
              className="inline-flex items-center gap-2 bg-neutral-950 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-neutral-800 transition-colors"
            >
              <span>Sign In to Account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-[11px] font-medium uppercase tracking-widest text-neutral-400 mb-8 border-b border-neutral-200 pb-4">
        <Link href="/account" className="hover:text-neutral-900 transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          <span>Client Account</span>
        </Link>
        <span>/</span>
        <span className="text-neutral-950 font-semibold">Delivery Destinations</span>
      </div>

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-8 border-b border-neutral-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-tight text-neutral-950">
            Delivery Destinations
          </h1>
          <p className="mt-1 text-xs text-neutral-500 font-light">
            Manage bespoke residential addresses, atelier delivery points, and billing information.
          </p>
        </div>

        {!isAdding && !editingAddress && (
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            className="bg-neutral-950 text-white hover:bg-neutral-800 text-xs uppercase tracking-wider flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Destination</span>
          </Button>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 flex items-center gap-3 text-xs border ${
            feedback.success
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message || feedback.error}</span>
        </div>
      )}

      {/* ADD NEW ADDRESS FORM */}
      {isAdding && (
        <div className="mb-10 border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-950">
              New Delivery Destination
            </h2>
            <button
              onClick={() => setIsAdding(false)}
              className="text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Recipient Full Name *
                </label>
                <Input name="recipientName" required placeholder="Lord Julian Vance" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Company / Residence (Optional)
                </label>
                <Input name="company" placeholder="Atelier Estate" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Street Address *
              </label>
              <Input name="addressLine1" required placeholder="740 Park Avenue" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Apartment, Suite, Unit (Optional)
              </label>
              <Input name="addressLine2" placeholder="Suite 14B" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  City *
                </label>
                <Input name="city" required placeholder="New York" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  State / Province *
                </label>
                <Input name="stateProvince" required placeholder="NY" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Postal Code *
                </label>
                <Input name="postalCode" required placeholder="10021" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Country *
                </label>
                <select
                  name="countryCode"
                  defaultValue="US"
                  className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs uppercase tracking-wider focus:border-neutral-950 focus:outline-none"
                >
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="FR">France (FR)</option>
                  <option value="IT">Italy (IT)</option>
                  <option value="DE">Germany (DE)</option>
                  <option value="JP">Japan (JP)</option>
                  <option value="AU">Australia (AU)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Contact Phone *
                </label>
                <Input name="phone" required placeholder="+1 (555) 019-2834" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="add-isDefault"
                name="isDefault"
                className="h-4 w-4 rounded-none border-neutral-300 text-neutral-900 focus:ring-neutral-950"
              />
              <label htmlFor="add-isDefault" className="text-xs text-neutral-700 cursor-pointer">
                Set as default delivery destination
              </label>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <Button
                type="submit"
                disabled={loading}
                className="bg-neutral-950 text-white hover:bg-neutral-800 text-xs uppercase tracking-wider"
              >
                {loading ? "Saving Destination..." : "Save Delivery Destination"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdding(false)}
                className="text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT ADDRESS FORM */}
      {editingAddress && (
        <div className="mb-10 border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-950">
              Edit Delivery Destination
            </h2>
            <button
              onClick={() => setEditingAddress(null)}
              className="text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4 max-w-2xl">
            <input type="hidden" name="addressId" value={editingAddress.id} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Recipient Full Name *
                </label>
                <Input
                  name="recipientName"
                  required
                  defaultValue={editingAddress.recipientName}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Company / Residence (Optional)
                </label>
                <Input
                  name="company"
                  defaultValue={editingAddress.company || ""}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Street Address *
              </label>
              <Input
                name="addressLine1"
                required
                defaultValue={editingAddress.addressLine1}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Apartment, Suite, Unit (Optional)
              </label>
              <Input
                name="addressLine2"
                defaultValue={editingAddress.addressLine2 || ""}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  City *
                </label>
                <Input
                  name="city"
                  required
                  defaultValue={editingAddress.city}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  State / Province *
                </label>
                <Input
                  name="stateProvince"
                  required
                  defaultValue={editingAddress.stateProvince}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Postal Code *
                </label>
                <Input
                  name="postalCode"
                  required
                  defaultValue={editingAddress.postalCode}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Country *
                </label>
                <select
                  name="countryCode"
                  defaultValue={editingAddress.countryCode || "US"}
                  className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs uppercase tracking-wider focus:border-neutral-950 focus:outline-none"
                >
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="FR">France (FR)</option>
                  <option value="IT">Italy (IT)</option>
                  <option value="DE">Germany (DE)</option>
                  <option value="JP">Japan (JP)</option>
                  <option value="AU">Australia (AU)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Contact Phone *
                </label>
                <Input
                  name="phone"
                  required
                  defaultValue={editingAddress.phone}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="edit-isDefault"
                name="isDefault"
                defaultChecked={editingAddress.isDefault}
                className="h-4 w-4 rounded-none border-neutral-300 text-neutral-900 focus:ring-neutral-950"
              />
              <label htmlFor="edit-isDefault" className="text-xs text-neutral-700 cursor-pointer">
                Set as default delivery destination
              </label>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <Button
                type="submit"
                disabled={loading}
                className="bg-neutral-950 text-white hover:bg-neutral-800 text-xs uppercase tracking-wider"
              >
                {loading ? "Updating..." : "Update Destination"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAddress(null)}
                className="text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* SAVED ADDRESSES GRID */}
      {addresses.length === 0 && !isAdding ? (
        <div className="border border-dashed border-neutral-300 p-12 text-center bg-neutral-50/50">
          <MapPin className="mx-auto h-8 w-8 text-neutral-400 stroke-1 mb-3" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
            No Saved Destinations
          </h3>
          <p className="mt-1 text-xs text-neutral-500 font-light max-w-sm mx-auto">
            You have not registered any delivery destinations yet. Add an address for expedited checkout.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => setIsAdding(true)}
              size="sm"
              className="bg-neutral-950 text-white text-xs uppercase tracking-wider"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add First Address
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => {
            const isDefault = Boolean(addr.isDefault || addr.isDefaultShipping);
            const isProcessing = actionInProgressId === addr.id;

            return (
              <div
                key={addr.id}
                className={`border p-6 flex flex-col justify-between transition-colors ${
                  isDefault ? "border-neutral-950 bg-white" : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-950">
                        {addr.recipientName}
                      </span>
                      {isDefault && (
                        <span className="inline-flex items-center gap-1 bg-neutral-950 text-white text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full">
                          <Check className="h-2.5 w-2.5" />
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  {addr.company && (
                    <div className="text-xs text-neutral-500 flex items-center gap-1 mb-1">
                      <Building className="h-3 w-3 text-neutral-400" />
                      <span>{addr.company}</span>
                    </div>
                  )}

                  <div className="text-xs text-neutral-700 leading-relaxed font-light">
                    <div>{addr.addressLine1}</div>
                    {addr.addressLine2 && <div>{addr.addressLine2}</div>}
                    <div>
                      {addr.city}, {addr.stateProvince} {addr.postalCode}
                    </div>
                    <div>{addr.countryCode}</div>
                  </div>

                  <div className="mt-3 text-xs text-neutral-500 flex items-center gap-1 font-mono">
                    <Phone className="h-3 w-3 text-neutral-400" />
                    <span>{addr.phone}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingAddress(addr)}
                      disabled={isProcessing}
                      className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                    <span className="text-neutral-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr.id)}
                      disabled={isProcessing}
                      className="text-xs font-semibold text-neutral-400 hover:text-rose-600 uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>

                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id)}
                      disabled={isProcessing}
                      className="text-[11px] font-medium text-neutral-500 hover:text-neutral-950 uppercase tracking-wider transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
