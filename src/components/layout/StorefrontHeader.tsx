import { Suspense } from "react";
import { AnnouncementBar } from "@/components/storefront/AnnouncementBar";
import { StorefrontHeaderBar } from "./StorefrontHeaderBar";
import { StorefrontHeaderSession } from "./StorefrontHeaderSession";

/**
 * StorefrontHeader:
 * Split into a static shell + async session loader wrapped in Suspense.
 * This prevents getSessionUser() (which calls cookies() + JWT verify + potential DB lookup)
 * from blocking page navigation. The page content renders immediately while
 * the session state hydrates asynchronously.
 */
export function StorefrontHeader() {
  return (
    <header
      id="storefront-global-header"
      className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-xs"
    >
      {/* Configurable Dismissible Promotional Announcement Bar */}
      <AnnouncementBar />

      {/* Session-aware header bar: loads user state asynchronously without blocking navigation */}
      <Suspense fallback={<StorefrontHeaderBar user={null} cartCount={0} />}>
        <StorefrontHeaderSession />
      </Suspense>
    </header>
  );
}
