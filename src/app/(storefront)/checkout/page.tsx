import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { getUserAddresses } from "@/lib/auth/user-store";
import { cartService } from "@/lib/cart/cart-service";
import { cookies } from "next/headers";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Secure Checkout | Atelier Men's Footwear",
  description: "Complete your footwear acquisition with secure checkout, complimentary shipping, and white-glove concierge options.",
};

export default async function CheckoutPage() {
  const user = await getSessionUser();
  const cookieStore = await cookies();
  const guestSessionToken = cookieStore.get("atelier_guest_cart_token")?.value;

  const cart = await cartService.getCart({
    userId: user?.id,
    guestSessionToken,
  });

  const savedAddresses = user ? await getUserAddresses(user.id) : [];

  return (
    <CheckoutClient
      initialCart={cart}
      user={user}
      savedAddresses={savedAddresses}
    />
  );
}
