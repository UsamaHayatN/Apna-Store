import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { ClientErrorSuppressor } from "@/components/common/ClientErrorSuppressor";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.brandName} | Men's Fashion & Footwear Platform`,
    template: `%s | ${siteConfig.brandName}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.brandName} | Men's Fashion & Footwear Platform`,
    description: siteConfig.description,
    type: "website",
    locale: "en_US",
    siteName: siteConfig.brandName,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.brandName} | Men's Fashion & Footwear Platform`,
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <body
        className="flex min-h-full flex-col font-sans bg-white text-neutral-900 antialiased selection:bg-neutral-900 selection:text-white"
        suppressHydrationWarning
      >
        <ClientErrorSuppressor />
        {children}
      </body>
    </html>
  );
}
