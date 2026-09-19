import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { ArrowLeft } from "lucide-react";
import { ContactClientView } from "./ContactClientView";

export const metadata: Metadata = {
  title: `Concierge & Contact | ${siteConfig.name}`,
  description:
    "Connect with our Atelier concierge for personalized sizing consultations, order assistance, bespoke commissions, and showroom inquiries.",
  openGraph: {
    title: `Concierge & Contact | ${siteConfig.name}`,
    description:
      "Connect with our Atelier concierge for personalized sizing consultations, order assistance, bespoke commissions, and showroom inquiries.",
  },
};

export default function ContactPage() {
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
            <span className="text-[#111111] font-bold">Contact</span>
          </nav>
        </div>
      </div>

      {/* Header Banner */}
      <section className="bg-[#111111] text-[#FFFFFF] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#AAAAAA] block mb-2">
              Direct Atelier Access
            </span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#FFFFFF]">
              Client Concierge
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#CCCCCC] font-light leading-relaxed">
              Whether requesting a private fit consultation, tracking a bespoke commission,
              or inquiring about seasonal releases, our client care specialists are at your disposal.
            </p>
          </div>
        </div>
      </section>

      {/* Main Interactive Contact Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <ContactClientView />
      </main>
    </div>
  );
}
