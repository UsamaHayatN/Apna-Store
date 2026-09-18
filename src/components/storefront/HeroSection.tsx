import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";

/* 
  EXACT HERO SHOWCASE SECTION DECODING:
  - Container Background: #F5F5F5 (Light-200) light grey container background
  - Left-Aligned Bold Headline: text-4xl / text-5xl / text-6xl, #111111 (Dark-900)
  - Subheadline: #757575 (Dark-700)
  - Dual CTAs:
    * Solid Black Button: #111111 (Dark-900) bg, #FFFFFF (Light-100) text, rounded-full
    * Outlined Button: border border-[#111111], text #111111, hover:bg-[#111111] hover:text-[#FFFFFF], rounded-full
*/

interface HeroSectionProps {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  mediaUrl?: string;
  mediaAlt?: string;
}

export function HeroSection({
  eyebrow = "New Season Release",
  headline = "Built For The Way You Move.",
  subheadline = "Engineered with precision European calfskin, architectural cushioning, and timeless silhouettes for elevated performance across every discipline.",
  primaryCtaText = "Shop Collection",
  primaryCtaHref = "/shop",
  secondaryCtaText = "Explore Footwear",
  secondaryCtaHref = "/category/sneakers",
  mediaUrl = "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200&auto=format&fit=crop",
  mediaAlt = "Athletic Footwear Hero Showcase",
}: HeroSectionProps) {
  return (
    <section
      id="storefront-hero"
      aria-label="Hero Showcase Section"
      className="w-full bg-[#FFFFFF] py-4 sm:py-6"
    >
      {/* Hero Outer Wrapper: #F5F5F5 (Light-200) Container Background */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#F5F5F5] border border-[#E5E5E5] p-8 sm:p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 z-10 text-left">
              {/* Eyebrow / Tag */}
              {eyebrow && (
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-[#111111]">
                    {eyebrow}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-[#111111]" />
                  <span className="text-xs font-semibold text-[#757575] tracking-wider uppercase">
                    Autumn / Winter 2026
                  </span>
                </div>
              )}

              {/* Bold Headline: #111111 (Dark-900), text-4xl sm:text-5xl lg:text-6xl */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#111111] uppercase leading-[1.04]">
                {headline}
              </h1>

              {/* Subheadline: #757575 (Dark-700) */}
              <p className="text-sm sm:text-base md:text-lg text-[#757575] font-normal leading-relaxed max-w-xl">
                {subheadline}
              </p>

              {/* Dual CTAs: Solid Black Button (#111111) & Outlined Button */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                {/* Solid Black Button: #111111 bg, #FFFFFF text */}
                <Link
                  href={primaryCtaHref}
                  id="hero-primary-cta"
                  className="inline-flex items-center justify-center gap-2 bg-[#111111] text-[#FFFFFF] hover:bg-neutral-800 px-8 py-4 rounded-full text-sm font-semibold tracking-normal transition-all duration-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#111111]"
                >
                  <span>{primaryCtaText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {/* Outlined Button: border border-[#111111], text #111111 */}
                {secondaryCtaText && secondaryCtaHref && (
                  <Link
                    href={secondaryCtaHref}
                    id="hero-secondary-cta"
                    className="inline-flex items-center justify-center gap-2 border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] px-8 py-4 rounded-full text-sm font-semibold tracking-normal transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  >
                    <span>{secondaryCtaText}</span>
                  </Link>
                )}
              </div>

              {/* Category Quick Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-2 text-xs text-[#757575]">
                <span className="font-semibold text-[#111111]">Featured Categories:</span>
                <Link
                  href="/category/men"
                  className="underline hover:text-[#111111] underline-offset-4"
                >
                  Men
                </Link>
                <span>•</span>
                <Link
                  href="/category/women"
                  className="underline hover:text-[#111111] underline-offset-4"
                >
                  Women
                </Link>
                <span>•</span>
                <Link
                  href="/category/kids"
                  className="underline hover:text-[#111111] underline-offset-4"
                >
                  Kids
                </Link>
                <span>•</span>
                <Link
                  href="/category/sneakers"
                  className="underline hover:text-[#111111] underline-offset-4"
                >
                  Sneakers
                </Link>
              </div>
            </div>

            {/* Right Visual Column (Hero Athletic Lifestyle/Footwear Media) */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] sm:aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#E5E5E5]">
                <Image
                  src={mediaUrl}
                  alt={mediaAlt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
                />
              </div>

              {/* Minimal floating specs card */}
              <div className="absolute -bottom-4 -left-4 hidden sm:block bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-4 shadow-md max-w-[200px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#757575] block">
                  Cushioning Tech
                </span>
                <span className="text-xs font-bold text-[#111111] mt-0.5 block">
                  Zero-Impact Foam Core
                </span>
                <span className="text-[10px] text-[#007D48] font-semibold mt-1 inline-block">
                  Sustainable Certified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
