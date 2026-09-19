import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Terms of Use | ${siteConfig.name}`,
  description: "Terms and conditions governing the access and use of the digital storefront and atelier portal.",
};

export default function TermsOfUsePage() {
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
            <span className="text-[#111111] font-bold">Terms of Use</span>
          </nav>
        </div>
      </div>

      {/* Header Banner */}
      <section className="bg-[#111111] text-[#FFFFFF] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#AAAAAA] block mb-2">
              Website Governance
            </span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#FFFFFF]">
              Terms of Use
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#CCCCCC] font-light leading-relaxed">
              Rules and stipulations for accessing and using the {siteConfig.brandName} digital ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* Document Content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-12 text-xs sm:text-sm text-[#757575] leading-relaxed space-y-8">
        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing, browsing, or utilizing this website, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms of Use, along with our Privacy Policy and Terms of Sale.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            2. Intellectual Property Rights
          </h2>
          <p>
            All content on this website—including footwear silhouette photography, editorial texts, brand emblems, UI architectures, software routines, and graphic designs—is the proprietary property of {siteConfig.brandName} or its licensing partners and is protected by international copyright, trademark, and trade dress statutes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            3. Account Security and Authentication
          </h2>
          <p>
            When establishing an account, you agree to maintain the strict confidentiality of your login credentials and cryptographic session tokens. You are responsible for all activities occurring under your authenticated profile.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            4. Prohibited Uses
          </h2>
          <p>
            You agree not to use web scrapers, automated crawlers, or injection scripts to compromise catalog data, reverse engineer proprietary software, or execute denial of service vectors against this application.
          </p>
        </section>
      </main>
    </div>
  );
}
