import { Truck, ShieldCheck, RefreshCw, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";

/* 
  TRUST SECTION DECODING:
  - Background: #F5F5F5 (Light-200) offset canvas
  - Border: #E5E5E5 (Light-300)
  - Typography: #111111 (Dark-900) titles, #757575 (Dark-700) descriptions
  - Icons: #111111 with #FFFFFF pill badge container
*/

export function TrustSection() {
  const pillars = [
    {
      icon: Truck,
      title: "Global Express Transit",
      description: `Complimentary express shipping on orders over ${siteConfig.currency.symbol}${siteConfig.inventory.freeShippingThreshold}. Fully tracked dispatch.`,
    },
    {
      icon: ShieldCheck,
      title: "Sustainable Longevity",
      description:
        "Engineered with resolable welt construction and regenerative materials. Designed to be worn for years.",
    },
    {
      icon: RefreshCw,
      title: "30-Day Effortless Returns",
      description:
        "Complimentary size, fit, and model exchanges within 30 days. Hassle-free portal and pre-paid labels.",
    },
    {
      icon: Sparkles,
      title: "Direct Workshop Craft",
      description:
        "Zero intermediary markups. Full-grain French and Italian calfskin sourced directly from certified tanneries.",
    },
  ];

  return (
    <section
      id="storefront-trust-pillars"
      aria-label="Atelier Guarantees and Privileges"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#F5F5F5] p-6 sm:p-10 lg:p-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="flex flex-col space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFFFF] border border-[#E5E5E5] shadow-xs">
                    <Icon className="h-5 w-5 text-[#111111]" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    {pillar.title}
                  </h4>
                </div>
                <p className="text-xs text-[#757575] font-normal leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
