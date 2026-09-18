import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";

/* 
  EDITORIAL SECTION DECODING:
  - Background: #111111 (Dark-900) contrast section with #FFFFFF typography
  - Subtle text: #AAAAAA / #757575
  - CTAs: #FFFFFF button with #111111 text (rounded-full pill)
*/

export function EditorialSection() {
  return (
    <section
      id="storefront-craftsmanship-editorial"
      aria-label="Atelier Craftsmanship Standard"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#111111] text-[#FFFFFF] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Editorial Image */}
          <div className="relative min-h-[380px] sm:min-h-[480px] w-full bg-[#111111]">
            <Image
              src="https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=1200&auto=format&fit=crop"
              alt="Artisanal cordwainer lasting benchcraft footwear"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-center filter contrast-105"
            />
            <div className="absolute inset-0 bg-[#111111]/30" />
          </div>

          {/* Editorial Text & Pillar Specs */}
          <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#AAAAAA]">
                The Atelier Standard
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-tight text-[#FFFFFF]">
                Engineered for Longevity, Resolved in Every Detail
              </h2>
              <p className="text-sm text-[#AAAAAA] font-normal leading-relaxed">
                Rather than adhering to fast-fashion cycles, our product architecture rests upon traditional European benchcraft and high-grade technical textiles. Each pair and garment utilizes sustainable materials and resilient cavities that contour uniquely to your movement over time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-neutral-800 pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#007D48]/20 text-[#007D48] mt-0.5">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF]">
                    Sustainable Materials
                  </h4>
                  <p className="mt-1 text-xs text-[#AAAAAA] font-normal">
                    Certified regenerative hides, organic cottons, and recycled technical polyesters.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D37918]/20 text-[#D37918] mt-0.5">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF]">
                    360° Welt & Stitching
                  </h4>
                  <p className="mt-1 text-xs text-[#AAAAAA] font-normal">
                    Fully resolable footwear construction designed to outlast ordinary shoes.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-[#FFFFFF] text-[#111111] px-6 py-3.5 text-xs font-bold uppercase tracking-wider hover:bg-[#F5F5F5] transition-colors shadow-xs"
              >
                <span>Read The Craftsmanship Story</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
