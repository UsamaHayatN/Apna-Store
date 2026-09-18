import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { wishlistService } from "@/lib/wishlist/wishlist-service";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, items: [], count: 0, error: "Unauthorized" }, { status: 401 });
    }

    const items = await wishlistService.getUserWishlist(user.id);
    const productIds = items.map((i) => i.productId);

    return NextResponse.json({
      success: true,
      items,
      productIds,
      count: items.length,
    });
  } catch (err) {
    console.error("GET /api/account/wishlist error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, requiresAuth: true, error: "Sign in required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { productId, variantId, action } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (action === "move_to_cart") {
      const res = await wishlistService.moveWishlistItemToCart(user.id, productId, variantId);
      return NextResponse.json({ ...res });
    }

    const result = await wishlistService.toggleWishlist(user.id, productId, variantId);
    return NextResponse.json({ ...result });
  } catch (err) {
    console.error("POST /api/account/wishlist error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID required" }, { status: 400 });
    }

    const result = await wishlistService.removeFromWishlist(user.id, productId);
    const count = await wishlistService.getWishlistCount(user.id);

    return NextResponse.json({ ...result, count });
  } catch (err) {
    console.error("DELETE /api/account/wishlist error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
