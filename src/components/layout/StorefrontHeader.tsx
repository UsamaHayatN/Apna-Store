import { getSessionUser } from "@/lib/auth/session";
import { AnnouncementBar } from "@/components/storefront/AnnouncementBar";
import { StorefrontHeaderBar } from "./StorefrontHeaderBar";

export async function StorefrontHeader() {
  const user = await getSessionUser();

  return (
    <header
      id="storefront-global-header"
      className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-xs"
    >
      {/* Configurable Dismissible Promotional Announcement Bar */}
      <AnnouncementBar />

      {/* Main Responsive Header Navigation Bar with Mobile Drawer */}
      <StorefrontHeaderBar user={user} cartCount={0} />
    </header>
  );
}
