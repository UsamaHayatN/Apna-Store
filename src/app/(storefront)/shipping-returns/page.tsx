import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Truck, RotateCcw, CreditCard, ShieldCheck, Check } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Shipping, Deliveries & Returns | ${siteConfig.name}`,
  description:
    "Complimentary express delivery on orders over $200. Simple, prepaid 30-day returns and exchanges for unworn footwear in original condition.",
  openGraph: {
    title: `Shipping, Deliveries & Returns | ${siteConfig.name}`,
    description:
      "Complimentary express delivery on orders over $200. Simple, prepaid 30-day returns and exchanges for unworn footwear in original condition.",
  },
};

export default function ShippingReturnsPage() {
  return (
    <div className="bg-[#FFFFFF] min-h-screen pb-20">
      {/* Breadcrumb */}
      <div className="border-b border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#757575]"
          >
            <Link
              href="/"
              className="hover:text-[#111111] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <span className="text-[#111111] font-bold">Shipping & Returns</span>
          </nav>
        </div>
      </div>

      {/* Header Banner */}
      <section className="bg-[#111111] text-[#FFFFFF] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#AAAAAA] block mb-2">
              Customer Fulfilment & Care
            </span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#FFFFFF]">
              Shipping & Returns
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#CCCCCC] font-light leading-relaxed">
              Transparent transit timelines, complimentary global threshold deliveries, and seamless
              30-day return procedures.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 space-y-16">
        {/* Shipping Speeds & Costs */}
        <section id="shipping" className="border border-[#E5E5E5] p-6 sm:p-10 bg-[#FFFFFF]">
          <div className="border-b border-[#E5E5E5] pb-5 mb-8">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#757575] flex items-center gap-1.5 mb-1">
              <Truck className="h-3.5 w-3.5 text-[#111111]" />
              <span>Transit Timelines</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
              Delivery Speeds & Rates
            </h2>
            <p className="mt-2 text-xs text-[#757575]">
              All parcels are dispatched in reinforced double-boxed packaging with protective cotton dust bags.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="border border-[#E5E5E5] p-6 bg-[#F5F5F5] flex flex-col justify-between">
              <div>
                <span className="inline-block bg-[#007D48] text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-3">
                  Complimentary Over ${siteConfig.inventory.freeShippingThreshold}
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-[#111111]">
                  Standard Ground Delivery
                </h3>
                <p className="mt-2 text-[#757575] leading-relaxed">
                  Reliable door-to-door courier service via FedEx / UPS ground. Tracking number provided immediately upon dispatch.
                </p>
                <div className="mt-4 space-y-1">
                  <p className="font-bold text-[#111111]">Timeframe: 3 – 5 Business Days</p>
                  <p className="text-[#757575]">
                    Rate: ${siteConfig.inventory.standardShippingFee} USD (Free on orders &ge; ${siteConfig.inventory.freeShippingThreshold})
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-[#E5E5E5] p-6 bg-[#FFFFFF] flex flex-col justify-between">
              <div>
                <span className="inline-block bg-[#111111] text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-3">
                  Expedited Priority
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-[#111111]">
                  Express Air Courier
                </h3>
                <p className="mt-2 text-[#757575] leading-relaxed">
                  Priority air shipping dispatched same-day for orders placed before 1:00 PM EST. Guaranteed delivery window.
                </p>
                <div className="mt-4 space-y-1">
                  <p className="font-bold text-[#111111]">Timeframe: 1 – 2 Business Days</p>
                  <p className="text-[#757575]">Rate: ${siteConfig.inventory.expressShippingFee} USD Flat Rate</p>
                </div>
              </div>
            </div>

            <div className="border border-[#E5E5E5] p-6 bg-[#FFFFFF] flex flex-col justify-between">
              <div>
                <span className="inline-block bg-[#757575] text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-3">
                  Worldwide
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-[#111111]">
                  International Atelier Delivery
                </h3>
                <p className="mt-2 text-[#757575] leading-relaxed">
                  Dispatched from our European atelier via DHL Express Worldwide. Includes all duties and customs clearance prepaid (DDP).
                </p>
                <div className="mt-4 space-y-1">
                  <p className="font-bold text-[#111111]">Timeframe: 4 – 7 Business Days</p>
                  <p className="text-[#757575]">Rate: Calculated at Checkout based on destination</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 30-Day Returns & Exchanges */}
        <section id="returns" className="border border-[#E5E5E5] p-6 sm:p-10 bg-[#FFFFFF]">
          <div className="border-b border-[#E5E5E5] pb-5 mb-8">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#757575] flex items-center gap-1.5 mb-1">
              <RotateCcw className="h-3.5 w-3.5 text-[#111111]" />
              <span>Hassle-Free Policy</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
              30-Day Complimentary Returns & Exchanges
            </h2>
            <p className="mt-2 text-xs text-[#757575]">
              We want you to feel confident in the fit and craftsmanship of every pair.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
            <div className="p-5 border border-[#E5E5E5] bg-[#F5F5F5]">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-2">
                1. Try Indoors On Carpet
              </span>
              <p className="text-[#757575] leading-relaxed">
                Leather outsoles mark easily on hard flooring. Please try your shoes on clean carpeted surfaces to preserve unworn condition.
              </p>
            </div>
            <div className="p-5 border border-[#E5E5E5] bg-[#F5F5F5]">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-2">
                2. Initiate Online
              </span>
              <p className="text-[#757575] leading-relaxed">
                Visit <Link href="/account/orders" className="underline font-medium text-[#111111]">Account &gt; Orders</Link> to generate an instant prepaid return shipping label.
              </p>
            </div>
            <div className="p-5 border border-[#E5E5E5] bg-[#F5F5F5]">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-2">
                3. Pack Safely
              </span>
              <p className="text-[#757575] leading-relaxed">
                Include original shoe box, cloth dust bags, extra laces, and accessories. Affix prepaid courier label to the outer box.
              </p>
            </div>
            <div className="p-5 border border-[#E5E5E5] bg-[#F5F5F5]">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-2">
                4. Prompt Credit
              </span>
              <p className="text-[#757575] leading-relaxed">
                Refunds are processed to the original payment method within 3 business days of inspection at our logistics hub.
              </p>
            </div>
          </div>
        </section>

        {/* Payment Options */}
        <section id="payments" className="border border-[#E5E5E5] p-6 sm:p-10 bg-[#FFFFFF]">
          <div className="border-b border-[#E5E5E5] pb-5 mb-8">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#757575] flex items-center gap-1.5 mb-1">
              <CreditCard className="h-3.5 w-3.5 text-[#111111]" />
              <span>Encrypted Security</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
              Accepted Payment Methods
            </h2>
            <p className="mt-2 text-xs text-[#757575]">
              Transactions are encrypted using 256-bit TLS encryption with zero merchant storage of sensitive card details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="border border-[#E5E5E5] p-5">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-1">
                Credit & Debit Cards
              </span>
              <p className="text-[#757575]">Visa, Mastercard, American Express, Discover, JCB, Diners Club.</p>
            </div>
            <div className="border border-[#E5E5E5] p-5">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-1">
                Digital Wallets
              </span>
              <p className="text-[#757575]">Apple Pay, Google Pay, and Shop Pay for instant biometric checkout.</p>
            </div>
            <div className="border border-[#E5E5E5] p-5">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-1">
                Currency & Taxes
              </span>
              <p className="text-[#757575]">Billed in USD ($). Local sales tax calculated precisely at checkout.</p>
            </div>
            <div className="border border-[#E5E5E5] p-5">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-1">
                Fraud Protection
              </span>
              <p className="text-[#757575]">Protected by 3D Secure 2.0 biometric challenge authentication.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
