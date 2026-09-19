import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Terms of Sale | ${siteConfig.name}`,
  description: "Official terms and conditions governing the purchase and delivery of footwear and menswear products.",
};

export default function TermsOfSalePage() {
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
            <span className="text-[#111111] font-bold">Terms of Sale</span>
          </nav>
        </div>
      </div>

      {/* Header Banner */}
      <section className="bg-[#111111] text-[#FFFFFF] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#AAAAAA] block mb-2">
              Legal Documentation
            </span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#FFFFFF]">
              Terms of Sale
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#CCCCCC] font-light leading-relaxed">
              Effective Date: September 2026. These terms govern all consumer transactions conducted via the {siteConfig.brandName} platform.
            </p>
          </div>
        </div>
      </section>

      {/* Document Content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-12 text-xs sm:text-sm text-[#757575] leading-relaxed space-y-8">
        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            1. Scope and Order Acceptance
          </h2>
          <p>
            By submitting an order through our storefront, you confirm that you are at least eighteen (18) years of age and legally capable of entering into binding contracts. The dispatch of an automated order confirmation email acknowledges receipt of your request; the contract between you and {siteConfig.brandName} is formally executed only upon package handover to the carrier.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            2. Pricing, Currency, and Sales Taxes
          </h2>
          <p>
            All prices are listed in United States Dollars (USD) unless explicitly designated otherwise. We reserve the right to correct typographical pricing anomalies. Applicable state and municipal sales taxes are calculated at checkout in compliance with local nexus regulations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            3. Shipping and Risk of Loss
          </h2>
          <p>
            Orders over ${siteConfig.inventory.freeShippingThreshold} USD qualify for complimentary standard shipping. Title and risk of loss for items purchased pass to you upon delivery by the carrier to the destination address specified during checkout.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            4. Returns, Exchanges, and Refunds
          </h2>
          <p>
            We provide a 30-day return and exchange window from the date of confirmed carrier delivery. Items must be returned in unworn, undamaged condition with all original packaging, cloth bags, and tags intact. For detailed instructions, consult our <Link href="/shipping-returns#returns" className="text-[#111111] underline font-medium">Shipping & Returns</Link> guidelines.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            5. Artisanal Warranty
          </h2>
          <p>
            All Goodyear-welted and handcrafted footwear pieces carry a one-year warranty covering manufacturing and material defects under reasonable wear. Normal patina, heel rubber wear, and superficial leather creases are inherent characteristics of organic leather rather than defects.
          </p>
        </section>
      </main>
    </div>
  );
}
