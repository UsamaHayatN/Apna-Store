"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  CreditCard,
  Building,
  ShieldCheck,
  Tag,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { CartSummary, CartItemDetail } from "@/lib/cart/cart-service";
import { SessionUser, UserAddress } from "@/types";
import {
  SHIPPING_METHODS,
  CheckoutShippingMethod,
  validateCouponAction,
  processCheckoutAction,
  ValidateCouponResult,
} from "@/app/actions/checkout";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface CheckoutClientProps {
  initialCart: CartSummary | null;
  user: SessionUser | null;
  savedAddresses: UserAddress[];
}

export function CheckoutClient({
  initialCart,
  user,
  savedAddresses,
}: CheckoutClientProps) {
  const router = useRouter();

  // Cart state
  const cart = initialCart;

  // Contact details
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");

  // Address selection
  const defaultAddress = savedAddresses.find((a) => a.isDefault || a.isDefaultShipping) || savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddress ? defaultAddress.id : "new"
  );

  const [addressForm, setAddressForm] = useState({
    recipientName: user ? `${user.firstName} ${user.lastName}` : "",
    company: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    countryCode: "US",
    phone: "",
  });

  // Shipping method
  const [shippingMethod, setShippingMethod] = useState<CheckoutShippingMethod>(
    SHIPPING_METHODS[0]
  );

  // Payment method
  const [paymentType, setPaymentType] = useState<"card" | "wire" | "cod">("card");
  const [cardForm, setCardForm] = useState({
    cardholderName: user ? `${user.firstName} ${user.lastName}` : "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Customer notes
  const [notes, setNotes] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatPrice = (val: number) => {
    return `${siteConfig.currency.symbol}${val.toFixed(2)}`;
  };

  const subtotal = cart?.subtotal || 0;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const estimatedTax = Math.round(taxableAmount * 0.08 * 100) / 100;
  const total = Math.round((taxableAmount + shippingMethod.price + estimatedTax) * 100) / 100;

  // Handle coupon apply
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponLoading(true);
    setCouponMessage(null);

    try {
      const res = await validateCouponAction(couponInput, subtotal);
      if (res.success) {
        setAppliedCoupon(res);
        setCouponMessage({
          type: "success",
          text: `Voucher ${res.code} applied: -${formatPrice(res.discountAmount || 0)} savings.`,
        });
      } else {
        setCouponMessage({ type: "error", text: res.error || "Invalid coupon code." });
      }
    } catch {
      setCouponMessage({ type: "error", text: "Failed to validate coupon." });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMessage(null);
  };

  // Submit checkout
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!cart || cart.items.length === 0) {
      setErrorMessage("Your shopping bag is empty.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please provide a valid client email address.");
      return;
    }

    // Resolve shipping address
    let activeShippingAddress = addressForm;
    if (user && selectedAddressId !== "new") {
      const found = savedAddresses.find((a) => a.id === selectedAddressId);
      if (found) {
        activeShippingAddress = {
          recipientName: found.recipientName,
          company: found.company || "",
          addressLine1: found.addressLine1,
          addressLine2: found.addressLine2 || "",
          city: found.city,
          stateProvince: found.stateProvince,
          postalCode: found.postalCode,
          countryCode: found.countryCode,
          phone: found.phone || phone,
        };
      }
    }

    if (
      !activeShippingAddress.recipientName.trim() ||
      !activeShippingAddress.addressLine1.trim() ||
      !activeShippingAddress.city.trim() ||
      !activeShippingAddress.postalCode.trim()
    ) {
      setErrorMessage("Please complete all required delivery address fields.");
      return;
    }

    if (paymentType === "card" && !cardForm.cardNumber.trim()) {
      setErrorMessage("Please enter a valid card number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await processCheckoutAction({
        customerEmail: email,
        customerPhone: phone || activeShippingAddress.phone,
        shippingAddress: activeShippingAddress,
        shippingMethodId: shippingMethod.id,
        paymentMethod: {
          type: paymentType,
          cardNumber: cardForm.cardNumber,
          cardholderName: cardForm.cardholderName || activeShippingAddress.recipientName,
          expiry: cardForm.expiry,
          cvc: cardForm.cvc,
        },
        couponCode: appliedCoupon?.code,
        customerNotes: notes,
      });

      if (res.success && res.orderNumber) {
        router.push(`/checkout/success?orderNumber=${res.orderNumber}`);
      } else {
        setErrorMessage(res.error || "Unable to process commission.");
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage("A network error occurred while processing your order. Please retry.");
      setIsSubmitting(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-neutral-300 stroke-1 mb-4" />
        <h1 className="text-2xl font-light uppercase tracking-tight text-neutral-950">
          Your Shopping Bag is Empty
        </h1>
        <p className="mt-2 text-xs text-neutral-500 font-light max-w-sm mx-auto">
          Add handcrafted footwear or leather goods to your bespoke bag to proceed with commissioning.
        </p>
        <div className="mt-6">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-neutral-950 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-neutral-800 transition-colors"
          >
            <span>Explore Collection</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-6 mb-8">
        <div>
          <Link
            href="/cart"
            className="inline-flex items-center text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            <span>Return to Shopping Bag</span>
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-light uppercase tracking-tight text-neutral-950">
            Atelier Checkout
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 border border-neutral-200 px-3 py-1.5 rounded-full bg-white">
          <Lock className="h-3.5 w-3.5 text-neutral-900" />
          <span className="font-mono text-[11px] uppercase tracking-wider">256-Bit Encrypted</span>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT: Checkout Sections (7 cols) */}
          <div className="lg:col-span-7 space-y-10">
            {/* SECTION 1: CLIENT IDENTIFICATION */}
            <div className="border border-neutral-200 bg-white p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] text-white">
                    1
                  </span>
                  Client Identification
                </h2>
                {!user && (
                  <Link
                    href="/account?redirect=/checkout"
                    className="text-[11px] text-neutral-500 hover:text-neutral-950 underline uppercase tracking-wider"
                  >
                    Sign in to account
                  </Link>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Client Email Address *
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@atelier.internal"
                  />
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Order confirmation and bespoke shipping tracking updates will be dispatched to this address.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: DELIVERY DESTINATION */}
            <div className="border border-neutral-200 bg-white p-6 sm:p-8">
              <div className="border-b border-neutral-100 pb-4 mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] text-white">
                    2
                  </span>
                  Delivery Destination
                </h2>
              </div>

              {/* Saved Address Selector if User is logged in */}
              {user && savedAddresses.length > 0 && (
                <div className="mb-6 space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Select From Saved Destinations
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`cursor-pointer border p-3.5 text-xs transition-colors ${
                            isSelected
                              ? "border-neutral-950 bg-neutral-50"
                              : "border-neutral-200 hover:border-neutral-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between font-medium text-neutral-900 mb-1">
                            <span>{addr.recipientName}</span>
                            {addr.isDefault && (
                              <span className="text-[9px] bg-neutral-200 px-1.5 py-0.5 uppercase tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-neutral-500 text-[11px] leading-relaxed">
                            <div>{addr.addressLine1}</div>
                            <div>
                              {addr.city}, {addr.stateProvince} {addr.postalCode}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div
                      onClick={() => setSelectedAddressId("new")}
                      className={`cursor-pointer border p-3.5 text-xs flex items-center justify-center text-center transition-colors ${
                        selectedAddressId === "new"
                          ? "border-neutral-950 bg-neutral-50 font-semibold"
                          : "border-dashed border-neutral-300 hover:border-neutral-400 text-neutral-500"
                      }`}
                    >
                      <span>+ Enter New Destination</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Address Form (shown if guest OR "new" is selected) */}
              {(!user || selectedAddressId === "new" || savedAddresses.length === 0) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Recipient Full Name *
                      </label>
                      <Input
                        required
                        value={addressForm.recipientName}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, recipientName: e.target.value })
                        }
                        placeholder="Julian Vance"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Company / Residence (Optional)
                      </label>
                      <Input
                        value={addressForm.company}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, company: e.target.value })
                        }
                        placeholder="Atelier Estate"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Street Address *
                    </label>
                    <Input
                      required
                      value={addressForm.addressLine1}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, addressLine1: e.target.value })
                      }
                      placeholder="740 Park Avenue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Apartment, Suite, Unit (Optional)
                    </label>
                    <Input
                      value={addressForm.addressLine2}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, addressLine2: e.target.value })
                      }
                      placeholder="Penthouse A"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        City *
                      </label>
                      <Input
                        required
                        value={addressForm.city}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, city: e.target.value })
                        }
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        State / Province *
                      </label>
                      <Input
                        required
                        value={addressForm.stateProvince}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, stateProvince: e.target.value })
                        }
                        placeholder="NY"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Postal Code *
                      </label>
                      <Input
                        required
                        value={addressForm.postalCode}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, postalCode: e.target.value })
                        }
                        placeholder="10021"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Country *
                      </label>
                      <select
                        value={addressForm.countryCode}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, countryCode: e.target.value })
                        }
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
                        required
                        value={addressForm.phone}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, phone: e.target.value })
                        }
                        placeholder="+1 (555) 019-2834"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: SHIPPING METHOD */}
            <div className="border border-neutral-200 bg-white p-6 sm:p-8">
              <div className="border-b border-neutral-100 pb-4 mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] text-white">
                    3
                  </span>
                  Shipping Service
                </h2>
              </div>

              <div className="space-y-3">
                {SHIPPING_METHODS.map((method) => {
                  const isSelected = shippingMethod.id === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setShippingMethod(method)}
                      className={`cursor-pointer border p-4 flex items-center justify-between transition-colors ${
                        isSelected
                          ? "border-neutral-950 bg-neutral-50"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping_method"
                          checked={isSelected}
                          onChange={() => setShippingMethod(method)}
                          className="h-4 w-4 border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                        />
                        <div>
                          <div className="text-xs font-semibold text-neutral-950 uppercase tracking-wider">
                            {method.name}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-light mt-0.5">
                            {method.estimatedDays}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-neutral-950 font-mono">
                        {method.price === 0 ? "COMPLIMENTARY" : formatPrice(method.price)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: PAYMENT METHOD */}
            <div className="border border-neutral-200 bg-white p-6 sm:p-8">
              <div className="border-b border-neutral-100 pb-4 mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] text-white">
                    4
                  </span>
                  Payment Architecture
                </h2>
              </div>

              {/* Payment Type Tabs */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentType("card")}
                  className={`border py-3 px-2 text-center transition-colors text-xs uppercase tracking-wider flex flex-col items-center gap-1.5 ${
                    paymentType === "card"
                      ? "border-neutral-950 bg-neutral-950 text-white font-semibold"
                      : "border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType("wire")}
                  className={`border py-3 px-2 text-center transition-colors text-xs uppercase tracking-wider flex flex-col items-center gap-1.5 ${
                    paymentType === "wire"
                      ? "border-neutral-950 bg-neutral-950 text-white font-semibold"
                      : "border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700"
                  }`}
                >
                  <Building className="h-4 w-4" />
                  <span>Bank Wire</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType("cod")}
                  className={`border py-3 px-2 text-center transition-colors text-xs uppercase tracking-wider flex flex-col items-center gap-1.5 ${
                    paymentType === "cod"
                      ? "border-neutral-950 bg-neutral-950 text-white font-semibold"
                      : "border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700"
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  <span>Delivery COD</span>
                </button>
              </div>

              {/* Card Inputs */}
              {paymentType === "card" && (
                <div className="space-y-4 bg-neutral-50 p-5 border border-neutral-200">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Cardholder Full Name *
                    </label>
                    <Input
                      required
                      value={cardForm.cardholderName}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, cardholderName: e.target.value })
                      }
                      placeholder="Julian Vance"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Card Number *
                    </label>
                    <Input
                      required
                      value={cardForm.cardNumber}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, cardNumber: e.target.value })
                      }
                      placeholder="4242 •••• •••• 4242"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Expiry Date *
                      </label>
                      <Input
                        required
                        value={cardForm.expiry}
                        onChange={(e) =>
                          setCardForm({ ...cardForm, expiry: e.target.value })
                        }
                        placeholder="MM / YY"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Security Code (CVC) *
                      </label>
                      <Input
                        required
                        type="password"
                        maxLength={4}
                        value={cardForm.cvc}
                        onChange={(e) =>
                          setCardForm({ ...cardForm, cvc: e.target.value })
                        }
                        placeholder="•••"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentType === "wire" && (
                <div className="bg-neutral-50 p-5 border border-neutral-200 text-xs text-neutral-600 leading-relaxed font-light">
                  <p className="font-semibold uppercase tracking-wider text-neutral-900 mb-1">
                    Atelier Private Client Wire Protocol
                  </p>
                  <p>
                    Upon finalizing this commission, dedicated IBAN and routing instructions will be dispatched to your email alongside your invoice. Footwear craftsmanship initiates upon remittance verification.
                  </p>
                </div>
              )}

              {paymentType === "cod" && (
                <div className="bg-neutral-50 p-5 border border-neutral-200 text-xs text-neutral-600 leading-relaxed font-light">
                  <p className="font-semibold uppercase tracking-wider text-neutral-900 mb-1">
                    Atelier Courier Handover (Cash on Delivery)
                  </p>
                  <p>
                    Remittance is collected securely by our licensed white-glove courier representative upon destination presentation and fit verification.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 5: SPECIAL INSTRUCTIONS */}
            <div className="border border-neutral-200 bg-white p-6 sm:p-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 mb-3">
                Concierge Notes & Delivery Instructions (Optional)
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Gate codes, concierge handling, or specific packaging preferences..."
                className="w-full border border-neutral-300 p-3 text-xs focus:border-neutral-950 focus:outline-none"
              />
            </div>
          </div>

          {/* RIGHT: Order Summary & Placement CTA (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-6">
              <div className="border border-neutral-200 bg-white p-6 sm:p-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 pb-4 border-b border-neutral-100 flex items-center justify-between">
                  <span>Commission Summary</span>
                  <span className="font-mono text-neutral-500 font-normal">
                    {cart.itemCount} {cart.itemCount === 1 ? "Item" : "Items"}
                  </span>
                </h2>

                {/* Items List Snapshot */}
                <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto my-4 pr-1">
                  {cart.items.map((item: CartItemDetail) => (
                    <div key={item.id} className="py-3.5 flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 bg-neutral-100 border border-neutral-200 overflow-hidden">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
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
                        <span className="absolute bottom-0 right-0 bg-neutral-950 text-white text-[9px] font-bold px-1.5 leading-tight">
                          x{item.quantity}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-neutral-950 truncate">
                          {item.productTitle}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate">
                          {item.variantTitle || item.brand}
                        </p>
                      </div>

                      <div className="text-xs font-mono font-bold text-neutral-950">
                        {formatPrice(item.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Input Form */}
                <div className="pt-4 border-t border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="PROMO OR ATELIER VOUCHER"
                      className="uppercase text-xs"
                      disabled={couponLoading || !!appliedCoupon}
                    />
                    {appliedCoupon ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveCoupon}
                        className="text-xs uppercase shrink-0 text-rose-600"
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        size="sm"
                        className="text-xs uppercase tracking-wider shrink-0 bg-neutral-950 text-white hover:bg-neutral-800"
                      >
                        {couponLoading ? "Checking..." : "Apply"}
                      </Button>
                    )}
                  </div>

                  {couponMessage && (
                    <div
                      className={`mt-2 flex items-center gap-1.5 text-[11px] ${
                        couponMessage.type === "success" ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {couponMessage.type === "success" ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                      ) : (
                        <AlertCircle className="h-3 w-3 shrink-0" />
                      )}
                      <span>{couponMessage.text}</span>
                    </div>
                  )}

                  {!appliedCoupon && (
                    <p className="mt-1.5 text-[10px] text-neutral-400">
                      Sample active codes: <span className="font-mono text-neutral-700 font-semibold">GENTLEMAN15</span> (15% off over $100), <span className="font-mono text-neutral-700 font-semibold">ATELIER50</span> ($50 off over $250).
                    </p>
                  )}
                </div>

                {/* Totals Breakdown */}
                <div className="mt-6 pt-4 border-t border-neutral-200 space-y-2.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span className="font-mono text-neutral-900">{formatPrice(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Discount ({appliedCoupon?.code})
                      </span>
                      <span className="font-mono">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-neutral-600">
                    <span>{shippingMethod.name}</span>
                    <span className="font-mono text-neutral-900">
                      {shippingMethod.price === 0 ? "Complimentary" : formatPrice(shippingMethod.price)}
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-600">
                    <span>Estimated Sales Tax (8%)</span>
                    <span className="font-mono text-neutral-900">{formatPrice(estimatedTax)}</span>
                  </div>

                  <div className="pt-3 border-t border-neutral-200 flex justify-between items-baseline font-bold text-base text-neutral-950">
                    <span>Total Amount</span>
                    <span className="font-mono text-lg">{formatPrice(total)} USD</span>
                  </div>
                </div>

                {/* Primary Submit Button */}
                <div className="mt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-widest transition-all"
                  >
                    {isSubmitting ? "Authorizing Commission..." : `Authorize & Place Order • ${formatPrice(total)}`}
                  </Button>
                </div>

                {/* Security Reassurance */}
                <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-neutral-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Atelier Authenticity Guarantee & Dispatched Insured</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
