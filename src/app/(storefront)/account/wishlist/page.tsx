import { getSessionUser } from "@/lib/auth/session";
import { wishlistService } from "@/lib/wishlist/wishlist-service";
import { WishlistClient } from "@/components/account/WishlistClient";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getSessionUser();

  if (!user) {
    return <WishlistClient initialItems={[]} isGuest={true} />;
  }

  const items = await wishlistService.getUserWishlist(user.id);

  return <WishlistClient initialItems={items} isGuest={false} />;
}
