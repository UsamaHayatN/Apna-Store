import { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { CartPageView } from "@/components/storefront/CartPageView";

export const metadata: Metadata = {
  title: `Shopping Bag | ${siteConfig.name}`,
  description: "Review and manage items in your shopping bag before proceeding to secure checkout.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CartPage() {
  return <CartPageView />;
}
