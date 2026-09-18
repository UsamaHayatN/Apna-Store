import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";

export const GUEST_CART_COOKIE = "cart_session_id";

export interface CartIdentity {
  userId?: string | null;
  guestSessionToken?: string | null;
  isGuest: boolean;
}

/**
 * Resolves the calling user's cart identity securely:
 * 1. If the user is logged in with a verified session, returns userId.
 * 2. If the user is a guest, returns or creates a secure guest session token stored in an httpOnly cookie.
 */
export async function resolveCartIdentity(): Promise<{
  identity: CartIdentity;
  setGuestCookieToken?: string;
}> {
  const user = await getSessionUser();

  if (user && user.id) {
    return {
      identity: {
        userId: user.id,
        guestSessionToken: null,
        isGuest: false,
      },
    };
  }

  const cookieStore = await cookies();
  const existingGuestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;

  if (existingGuestToken && existingGuestToken.trim().length > 0) {
    return {
      identity: {
        userId: null,
        guestSessionToken: existingGuestToken,
        isGuest: true,
      },
    };
  }

  // Generate a new cryptographically secure guest session token
  const newGuestToken = crypto.randomUUID();

  return {
    identity: {
      userId: null,
      guestSessionToken: newGuestToken,
      isGuest: true,
    },
    setGuestCookieToken: newGuestToken,
  };
}

/**
 * Sets the guest cart cookie if a new token was generated.
 */
export async function ensureGuestCartCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
