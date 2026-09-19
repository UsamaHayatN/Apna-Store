import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${siteConfig.name}`,
  description: "Our standards and practices for safeguarding personal data, authentication details, and transaction privacy.",
};

export default function PrivacyPolicyPage() {
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
            <span className="text-[#111111] font-bold">Privacy Policy</span>
          </nav>
        </div>
      </div>

      {/* Header Banner */}
      <section className="bg-[#111111] text-[#FFFFFF] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#AAAAAA] block mb-2">
              Data Protection & Privacy
            </span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#FFFFFF]">
              Privacy Policy
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#CCCCCC] font-light leading-relaxed">
              We respect your right to privacy and are committed to maintaining transparent data practices in compliance with global standards.
            </p>
          </div>
        </div>
      </section>

      {/* Document Content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-12 text-xs sm:text-sm text-[#757575] leading-relaxed space-y-8">
        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            1. Information We Collect
          </h2>
          <p>
            When you interact with our platform, we collect information you provide directly to us: your name, billing and shipping addresses, email address, telephone number, and order preferences. Payment card details are tokenized securely through PCI-DSS certified gateways and are never stored directly on our servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            2. Purpose of Data Processing
          </h2>
          <p>
            We process your personal data exclusively to fulfill purchase contracts, coordinate package deliveries with verified logistics couriers, issue order updates, and provide personalized concierge support.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            3. Cookies and Session Storage
          </h2>
          <p>
            We use secure HTTP-only cookies and local session state to preserve your shopping bag contents across visits and retain your authenticated session. You can manage or disable cookies in your web browser preferences at any time.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black uppercase tracking-tight text-[#111111]">
            4. Your Data Rights
          </h2>
          <p>
            Depending on your jurisdiction (such as under GDPR or CCPA), you possess the right to access, rectify, or request the deletion of your personal data held in our customer directory. To exercise these rights, submit a request via our <Link href="/contact" className="text-[#111111] underline font-medium">Concierge Page</Link> or email us at {siteConfig.contact.email}.
          </p>
        </section>
      </main>
    </div>
  );
}
