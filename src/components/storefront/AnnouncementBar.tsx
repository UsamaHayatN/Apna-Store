"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";

interface AnnouncementBarProps {
  customText?: string;
  customHref?: string;
}

export function AnnouncementBar({ customText, customHref }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    try {
      const dismissed = window.sessionStorage.getItem("announcement_dismissed");
      if (dismissed === "true") {
        setIsVisible(false);
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      window.sessionStorage.setItem("announcement_dismissed", "true");
    } catch {
      // Ignore
    }
  };

  if (!isVisible || !siteConfig.announcement.enabled) {
    return null;
  }

  const text = customText || siteConfig.announcement.text;
  const href = customHref || siteConfig.announcement.linkHref || "/shop";
  const highlight = siteConfig.announcement.highlightText;

  return (
    /* Top Banner Background: #111111 (Dark-900), Text: #FFFFFF (Light-100) */
    <aside
      id="storefront-announcement-bar"
      aria-label="Storefront Announcement"
      className="relative z-50 bg-[#111111] text-[#FFFFFF] border-b border-[#222222] text-[11px] font-medium tracking-wider"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex-1 flex items-center justify-center gap-2.5 text-center">
          {highlight && (
            <span className="hidden sm:inline-block uppercase tracking-widest text-[9px] font-bold bg-[#222222] text-[#E5E5E5] px-2 py-0.5 rounded border border-[#333333]">
              {highlight}
            </span>
          )}
          <span className="text-[#E5E5E5] font-normal truncate max-w-md sm:max-w-none">
            {text}
          </span>
          {siteConfig.announcement.linkText && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-[#FFFFFF] underline underline-offset-4 hover:text-[#AAAAAA] transition-colors uppercase text-[10px] font-semibold tracking-widest ml-1"
            >
              <span>{siteConfig.announcement.linkText}</span>
              <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss Announcement"
          className="p-1 text-[#AAAAAA] hover:text-[#FFFFFF] transition-colors focus:outline-none focus:ring-1 focus:ring-[#AAAAAA]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
