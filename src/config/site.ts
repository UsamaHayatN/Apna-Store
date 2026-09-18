export interface NavItem {
  title: string;
  href: string;
  description?: string;
  badge?: string;
}

export interface SiteConfig {
  name: string;
  brandName: string;
  tagline: string;
  description: string;
  currency: {
    code: string;
    symbol: string;
    locale: string;
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
  inventory: {
    lowStockThresholdDefault: number;
    freeShippingThreshold: number; // in dollars
    standardShippingFee: number;
    expressShippingFee: number;
  };
  announcement: {
    enabled: boolean;
    text: string;
    highlightText?: string;
    linkText?: string;
    linkHref?: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    primaryCtaText: string;
    primaryCtaHref: string;
    secondaryCtaText: string;
    secondaryCtaHref: string;
    mediaUrl: string;
    mediaAlt: string;
  };
  socialLinks: Array<{
    name: string;
    href: string;
  }>;
  contact: {
    email: string;
    phone: string;
    hours: string;
  };
  navigation: {
    main: NavItem[];
    categories: NavItem[];
    account: NavItem[];
    admin: NavItem[];
  };
}

export const siteConfig: SiteConfig = {
  name: "YOUR BRAND",
  brandName: "YOUR BRAND",
  tagline: "Refined Craftsmanship in Modern Men's Footwear & Wardrobe",
  description:
    "An architectural e-commerce platform starting with artisanal men's footwear, engineered to scale into comprehensive men's tailoring and accessories.",
  currency: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
  },
  pagination: {
    defaultLimit: 12,
    maxLimit: 48,
  },
  inventory: {
    lowStockThresholdDefault: 5,
    freeShippingThreshold: 200,
    standardShippingFee: 15,
    expressShippingFee: 35,
  },
  announcement: {
    enabled: true,
    text: "Complimentary express delivery on orders over $200",
    highlightText: "Autumn / Winter 2026",
    linkText: "Explore Release",
    linkHref: "/shop",
  },
  hero: {
    eyebrow: "Autumn / Winter Footwear Drop",
    headline: "Built for the Way You Move.",
    subheadline:
      "Precision-crafted European calfskin, Goodyear-welted construction, and timeless architectural silhouettes engineered for modern distinction.",
    primaryCtaText: "Explore Collection",
    primaryCtaHref: "/shop",
    secondaryCtaText: "Artisanal Sneakers",
    secondaryCtaHref: "/category/sneakers",
    mediaUrl:
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1920&auto=format&fit=crop",
    mediaAlt: "Crafted European leather footwear editorial preview",
  },
  socialLinks: [
    { name: "Instagram", href: "https://instagram.com" },
    { name: "Twitter / X", href: "https://x.com" },
    { name: "LinkedIn", href: "https://linkedin.com" },
  ],
  contact: {
    email: "concierge@yourbrand.com",
    phone: "+1 (800) 555-0199",
    hours: "Mon – Fri: 9:00 AM – 6:00 PM EST",
  },
  navigation: {
    main: [
      { title: "Men", href: "/category/men" },
      { title: "Women", href: "/category/women" },
      { title: "Kids", href: "/category/kids" },
      { title: "Collections", href: "/collections" },
      { title: "Contact", href: "/contact" },
    ],
    categories: [
      { title: "Sneakers", href: "/category/sneakers", description: "Minimalist leather & technical runners" },
      { title: "Casual Shoes", href: "/category/casual", description: "Everyday suede & derby shoes" },
      { title: "Formal Shoes", href: "/category/formal", description: "Goodyear-welted oxfords & monkstraps" },
      { title: "Boots", href: "/category/boots", description: "Chelsea, combat, and rugged service boots" },
      { title: "Sandals & Slides", href: "/category/sandals", description: "Molded footbed and leather strap slides" },
      { title: "Housewear & Slippers", href: "/category/slippers", description: "Shearling-lined indoor footwear" },
      { title: "Sports & Athletics", href: "/category/sports", description: "High-traction athletic performance trainers" },
    ],
    account: [
      { title: "Overview", href: "/account" },
      { title: "Orders", href: "/account/orders" },
      { title: "Saved Addresses", href: "/account/addresses" },
      { title: "Wishlist", href: "/account/wishlist" },
    ],
    admin: [
      { title: "Overview", href: "/admin" },
      { title: "Products", href: "/admin/products" },
      { title: "Inventory", href: "/admin/inventory" },
      { title: "Orders", href: "/admin/orders" },
      { title: "Customers", href: "/admin/customers" },
      { title: "Coupons", href: "/admin/coupons" },
      { title: "Store Settings", href: "/admin/settings" },
    ],
  },
};
