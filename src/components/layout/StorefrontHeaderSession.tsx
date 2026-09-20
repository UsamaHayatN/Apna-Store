import { getSessionUser } from "@/lib/auth/session";
import { StorefrontHeaderBar } from "./StorefrontHeaderBar";

/**
 * Server component that asynchronously resolves the session user
 * and renders the full header bar. Wrapped in Suspense by StorefrontHeader
 * so it never blocks page content rendering.
 */
export async function StorefrontHeaderSession() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    // Gracefully degrade — render header without user state
    // rather than crashing the entire page layout
  }

  return <StorefrontHeaderBar user={user} cartCount={0} />;
}
