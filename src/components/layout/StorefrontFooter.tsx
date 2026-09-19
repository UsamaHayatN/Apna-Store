import Link from "next/link";
import { siteConfig } from "@/config/site";
import { ShieldCheck, MapPin } from "lucide-react";

/* 
  EXACT FOOTER SYSTEM DECODING:
  - Upper Directory: #FFFFFF (Light-100) canvas with #111111 (Dark-900) headings and #757575 (Dark-700) links
  - Dividers: #E5E5E5 (Light-300)
  - Bottom Bar:
    * Background: #111111 (Dark-900) black background
    * Left-aligned location indicator: "Croatia" + copyright info
    * Right Footer Links: Horizontal list containing "Guides", "Terms of Sale", "Terms of Use", "Privacy Policy"
    * Typography: #AAAAAA (Dark-500) secondary text with #FFFFFF (Light-100) hover state
*/

export function StorefrontFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="storefront-global-footer"
      aria-label="Global Storefront Footer"
      className="border-t border-[#E5E5E5] bg-[#FFFFFF] text-[#111111]"
    >
      {/* Upper 4-Column Directory Layout */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Col 1: Categories & Departments */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              Departments
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#757575]">
              <li>
                <Link href="/category/men" className="hover:text-[#111111] transition-colors font-medium">
                  Men&apos;s Collection
                </Link>
              </li>
              <li>
                <Link href="/category/women" className="hover:text-[#111111] transition-colors">
                  Women&apos;s Collection
                </Link>
              </li>
              <li>
                <Link href="/category/kids" className="hover:text-[#111111] transition-colors">
                  Kids & Youth
                </Link>
              </li>
              <li>
                <Link href="/collections" className="hover:text-[#111111] transition-colors">
                  Capsule Collections
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-[#111111] transition-colors">
                  All Products
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Footwear & Lifestyle Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              Featured Categories
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#757575]">
              <li>
                <Link href="/category/sneakers" className="hover:text-[#111111] transition-colors">
                  Footwear & Sneakers
                </Link>
              </li>
              <li>
                <Link href="/category/clothing" className="hover:text-[#111111] transition-colors">
                  Clothing & Knitwear
                </Link>
              </li>
              <li>
                <Link href="/category/accessories" className="hover:text-[#111111] transition-colors">
                  Accessories & Bags
                </Link>
              </li>
              <li>
                <Link href="/category/equipment" className="hover:text-[#111111] transition-colors">
                  Equipment & Care Kits
                </Link>
              </li>
              <li>
                <Link href="/category/boots" className="hover:text-[#111111] transition-colors">
                  Handcrafted Boots
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              Customer Service
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#757575]">
              <li>
                <Link href="/account/orders" className="hover:text-[#111111] transition-colors">
                  Order Status & Tracking
                </Link>
              </li>
              <li>
                <Link href="/shipping-returns#shipping" className="hover:text-[#111111] transition-colors">
                  Shipping & Deliveries
                </Link>
              </li>
              <li>
                <Link href="/shipping-returns#returns" className="hover:text-[#111111] transition-colors">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link href="/shipping-returns#payments" className="hover:text-[#111111] transition-colors">
                  Payment Options
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#111111] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li className="pt-2">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#111111] hover:text-[#757575] transition-colors border-b border-[#111111] pb-0.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                  <span>Admin Management Console</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: About Brand & Sustainability */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              About {siteConfig.brandName}
            </h4>
            <p className="text-xs leading-relaxed text-[#757575] font-normal">
              {siteConfig.tagline}. Handcrafted footwear, technical apparel, and purposeful lifestyle goods engineered for enduring performance.
            </p>

            <div className="space-y-1 text-xs text-[#757575] font-normal pt-1">
              <p>Email: {siteConfig.contact.email}</p>
              <p>Support: {siteConfig.contact.hours}</p>
            </div>

            <div className="flex gap-4 pt-1 text-xs font-semibold text-[#111111]">
              {siteConfig.socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#757575] transition-colors"
                >
                  {s.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 
        EXACT BOTTOM BAR:
        - Black background (#111111)
        - Left-aligned location indicator: "Croatia" + copyright info
        - Right Footer Links: Horizontal list containing "Guides", "Terms of Sale", "Terms of Use", "Privacy Policy"
        - Text colors: #AAAAAA with #FFFFFF hover
      */}
      <div className="w-full bg-[#111111] text-[#AAAAAA] border-t border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Location Indicator "Croatia" + Copyright Info */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-[#FFFFFF] font-semibold">
              <MapPin className="h-3.5 w-3.5 text-[#FFFFFF]" />
              <span>Croatia</span>
            </div>
            <span className="text-neutral-600 hidden sm:inline">•</span>
            <p className="text-[#AAAAAA]">
              © {currentYear} {siteConfig.brandName}, Inc. All Rights Reserved
            </p>
          </div>

          {/* Right: Horizontal list containing "Guides", "Terms of Sale", "Terms of Use", "Privacy Policy" */}
          <nav aria-label="Legal and Guide Links" className="flex flex-wrap items-center justify-center gap-5 sm:gap-7">
            <Link
              href="/guides"
              className="text-[#AAAAAA] hover:text-[#FFFFFF] transition-colors whitespace-nowrap"
            >
              Guides
            </Link>
            <Link
              href="/terms-of-sale"
              className="text-[#AAAAAA] hover:text-[#FFFFFF] transition-colors whitespace-nowrap"
            >
              Terms of Sale
            </Link>
            <Link
              href="/terms-of-use"
              className="text-[#AAAAAA] hover:text-[#FFFFFF] transition-colors whitespace-nowrap"
            >
              Terms of Use
            </Link>
            <Link
              href="/privacy-policy"
              className="text-[#AAAAAA] hover:text-[#FFFFFF] transition-colors whitespace-nowrap"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
