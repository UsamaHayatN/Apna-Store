import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { getUserAddresses } from "@/lib/auth/user-store";
import { cartService } from "@/lib/cart/cart-service";
import { resolveCartIdentity } from "@/lib/cart/cart-session";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Secure Checkout | Atelier Men's Footwear",
  description: "Complete your footwear acquisition with secure checkout, complimentary shipping, and white-glove concierge options.",
};

export default async function CheckoutPage() {
  const user = await getSessionUser();
  const { identity } = await resolveCartIdentity();

  const cart = await cartService.getCart(identity);

  const savedAddresses = user ? await getUserAddresses(user.id) : [];

  return (
    <CheckoutClient
      initialCart={cart}
      user={user}
      savedAddresses={savedAddresses}
    />
  );
}
