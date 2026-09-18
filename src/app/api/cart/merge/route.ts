import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { cartService } from "@/lib/cart/cart-service";
import { GUEST_CART_COOKIE } from "@/lib/cart/cart-session";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Must be signed in to merge cart" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;

    if (!guestToken) {
      const currentCart = await cartService.getCart({ userId: user.id });
      return NextResponse.json({ success: true, cart: currentCart, merged: false });
    }

    const mergedCart = await cartService.mergeGuestCart(user.id, guestToken);

    // Delete the guest cart cookie
    cookieStore.delete(GUEST_CART_COOKIE);

    return NextResponse.json({ success: true, cart: mergedCart, merged: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to merge shopping bag";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
