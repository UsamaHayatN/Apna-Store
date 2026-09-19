import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Ruler, ShieldCheck, Sparkles, Check, Info } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Guides & Craftsmanship | ${siteConfig.name}`,
  description:
    "Explore our comprehensive footwear guides: international size conversion tables, Goodyear-welted construction guides, and artisanal leather maintenance protocols.",
  openGraph: {
    title: `Guides & Craftsmanship | ${siteConfig.name}`,
    description:
      "Explore our comprehensive footwear guides: international size conversion tables, Goodyear-welted construction guides, and artisanal leather maintenance protocols.",
  },
};

export default function GuidesPage() {
  const sizeConversion = [
    { eu: "39", us: "6.5", uk: "6.0", cm: "24.5" },
    { eu: "40", us: "7.5", uk: "7.0", cm: "25.0" },
    { eu: "41", us: "8.0", uk: "7.5", cm: "25.8" },
    { eu: "42", us: "9.0", uk: "8.5", cm: "26.5" },
    { eu: "43", us: "10.0", uk: "9.5", cm: "27.3" },
    { eu: "44", us: "10.5", uk: "10.0", cm: "28.0" },
    { eu: "45", us: "11.5", uk: "11.0", cm: "28.8" },
    { eu: "46", us: "12.5", uk: "12.0", cm: "29.5" },
    { eu: "47", us: "13.0", uk: "12.5", cm: "30.2" },
  ];

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
            <span className="text-[#111111] font-bold">Guides & Craftsmanship</span>
          </nav>
        </div>
      </div>

      {/* Header Banner */}
      <section className="bg-[#111111] text-[#FFFFFF] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#AAAAAA] block mb-2">
              Atelier Technical Standards
            </span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#FFFFFF]">
              Guides & Protocols
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#CCCCCC] font-light leading-relaxed">
              Precision sizing charts, anatomy of European benchcraft construction, and proven care
              regimens to ensure your investment endures for decades.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 space-y-16">
        {/* Section 1: International Footwear Size Conversion */}
        <section id="sizing" className="border border-[#E5E5E5] p-6 sm:p-10 bg-[#FFFFFF]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E5E5] pb-5 mb-8 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#757575] flex items-center gap-1.5 mb-1">
                <Ruler className="h-3.5 w-3.5 text-[#111111]" />
                <span>Fit & Measurement</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
                International Footwear Sizing Conversion
              </h2>
            </div>
            <p className="text-xs text-[#757575] sm:max-w-xs">
              All our formal footwear and boots are crafted on true-to-size European lasts (EU sizing standard).
            </p>
          </div>

          {/* Sizing Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#E5E5E5]">
              <thead>
                <tr className="bg-[#F5F5F5] text-[#111111] uppercase tracking-wider font-bold border-b border-[#E5E5E5]">
                  <th className="p-3.5">EU Size (Standard)</th>
                  <th className="p-3.5">US Men</th>
                  <th className="p-3.5">UK Men</th>
                  <th className="p-3.5">Foot Length (CM)</th>
                  <th className="p-3.5">Fit Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] text-[#757575]">
                {sizeConversion.map((row) => (
                  <tr key={row.eu} className="hover:bg-[#F5F5F5]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#111111]">{row.eu}</td>
                    <td className="p-3.5">{row.us}</td>
                    <td className="p-3.5">{row.uk}</td>
                    <td className="p-3.5 font-mono">{row.cm} cm</td>
                    <td className="p-3.5">True to Size (Regular D Width)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Measuring Instructions */}
          <div className="mt-8 border-t border-[#E5E5E5] pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-4 bg-[#F5F5F5]">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-1">
                1. Measure in the Evening
              </span>
              <p className="text-[#757575] leading-relaxed">
                Feet expand naturally throughout the day. For the most accurate fit, take measurements in late afternoon or evening.
              </p>
            </div>
            <div className="p-4 bg-[#F5F5F5]">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-1">
                2. Wear Intended Socks
              </span>
              <p className="text-[#757575] leading-relaxed">
                Wear the dress socks or cushioned athletic socks you plan to use with the silhouette.
              </p>
            </div>
            <div className="p-4 bg-[#F5F5F5]">
              <span className="font-bold uppercase tracking-wider text-[#111111] block mb-1">
                3. Between Sizes?
              </span>
              <p className="text-[#757575] leading-relaxed">
                For lace-up oxfords and derbies, size down half a size. For chelsea boots and sneakers, we recommend sizing up to the next full size.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Construction Anatomy */}
        <section id="construction" className="border border-[#E5E5E5] p-6 sm:p-10 bg-[#FFFFFF]">
          <div className="border-b border-[#E5E5E5] pb-5 mb-8">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#757575] flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#111111]" />
              <span>Structural Engineering</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
              Benchcraft Construction Anatomy
            </h2>
            <p className="mt-2 text-xs text-[#757575]">
              Understanding the mechanical differences between Goodyear Welted, Blake Stitched, and Strobel construction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
            <div className="border border-[#E5E5E5] p-6 bg-[#FFFFFF] flex flex-col justify-between">
              <div>
                <span className="inline-block bg-[#111111] text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-3">
                  Benchmark
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-[#111111]">
                  Goodyear-Welted
                </h3>
                <p className="mt-3 text-[#757575] leading-relaxed">
                  A dedicated leather welt is machine-stitched both to the upper leather and the insole rib. A layer of granulated cork is inserted into the cavity, which molds to your footbed over time.
                </p>
                <ul className="mt-4 space-y-2 text-[#757575]">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#007D48] shrink-0" />
                    <span>Infinite Resolability (Decades of Service)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#007D48] shrink-0" />
                    <span>Exceptional Water Ingress Resistance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#007D48] shrink-0" />
                    <span>Custom Cork Mold Footbed</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E5E5E5] text-[11px] text-[#AAAAAA]">
                Applied on: Heritage Oxfords, Derbies, Combat & Chelsea Boots
              </div>
            </div>

            <div className="border border-[#E5E5E5] p-6 bg-[#FFFFFF] flex flex-col justify-between">
              <div>
                <span className="inline-block bg-[#757575] text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-3">
                  Flexibility
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-[#111111]">
                  Blake Stitch
                </h3>
                <p className="mt-3 text-[#757575] leading-relaxed">
                  The upper is wrapped around the insole and stitched directly to the outsole from the inside. This eliminates the exterior welt, yielding a sleek, close-cut silhouette with immediate flexibility.
                </p>
                <ul className="mt-4 space-y-2 text-[#757575]">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#007D48] shrink-0" />
                    <span>Zero Break-in Period</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#007D48] shrink-0" />
                    <span>Ultra-Lightweight & Sleek Profile</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#007D48] shrink-0" />
                    <span>Resoleable with Blake Machining</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E5E5E5] text-[11px] text-[#AAAAAA]">
                Applied on: Unlined Loafers, Driving Shoes, Dress Slippers
              </div>
            </div>

            <div className="border border-[#E5E5E5] p-6 bg-[#FFFFFF] flex flex-col justify-between">
              <div>
                <span className="inline-block bg-[#007D48] text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-3">
                  Athletic
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-[#111111]">
                  Strobel & Cupsole
                </h3>
                <p className="mt-3 text-[#757575] leading-relaxed">
                  The leather upper is stitched to a flexible fabric sock before being bonded into a vulcanized or Margom rubber cupsole with 360-degree sidewall stitching.
                </p>
                <ul className="mt-4 space-y-2 text-[#757575]">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#007D48] shrink-0" />
                    <span>Maximum Cushioning & Energy Return</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#007D48] shrink-0" />
                    <span>360° Sidewall Reinforced Stitching</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#007D48] shrink-0" />
                    <span>Orthotic-Compatible Removable Insole</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E5E5E5] text-[11px] text-[#AAAAAA]">
                Applied on: Minimalist Leather Sneakers, Urban Runners
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Leather Care Protocols */}
        <section id="care" className="border border-[#E5E5E5] p-6 sm:p-10 bg-[#FFFFFF]">
          <div className="border-b border-[#E5E5E5] pb-5 mb-8">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#757575] flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-[#111111]" />
              <span>Longevity Care</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
              Artisanal Leather Maintenance Protocol
            </h2>
            <p className="mt-2 text-xs text-[#757575]">
              Natural full-grain leather is an organic material that breathes, develops patina, and requires regular conditioning.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="p-5 border border-[#E5E5E5] bg-[#F5F5F5]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#111111] block mb-2">
                Phase 1: Dust & Clean
              </span>
              <p className="text-[#757575] leading-relaxed">
                Brush vigorously with a 100% horsehair brush after every wear to remove abrasive dust, micro-dirt, and grit from welt seams.
              </p>
            </div>
            <div className="p-5 border border-[#E5E5E5] bg-[#F5F5F5]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#111111] block mb-2">
                Phase 2: Hydrate
              </span>
              <p className="text-[#757575] leading-relaxed">
                Apply a small pea-sized amount of beeswax and lanolin cream conditioner every 10–15 wears. Allow to absorb for 20 minutes before buffing.
              </p>
            </div>
            <div className="p-5 border border-[#E5E5E5] bg-[#F5F5F5]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#111111] block mb-2">
                Phase 3: Cedar Trees
              </span>
              <p className="text-[#757575] leading-relaxed">
                Insert aromatic cedar shoe trees immediately after taking shoes off. Cedar draws out moisture, maintains toe spring, and prevents creasing.
              </p>
            </div>
            <div className="p-5 border border-[#E5E5E5] bg-[#F5F5F5]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#111111] block mb-2">
                Phase 4: Rotation
              </span>
              <p className="text-[#757575] leading-relaxed">
                Never wear fine leather shoes on consecutive days. Give them 24 to 48 hours to dry completely on cedar trees to double their lifespan.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
