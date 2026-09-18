import { NextRequest, NextResponse } from "next/server";
import { cartService } from "@/lib/cart/cart-service";
import { resolveCartIdentity, ensureGuestCartCookie } from "@/lib/cart/cart-session";

export async function GET() {
  try {
    const { identity, setGuestCookieToken } = await resolveCartIdentity();
    if (setGuestCookieToken) {
      await ensureGuestCartCookie(setGuestCookieToken);
    }

    const cart = await cartService.getCart(identity);
    return NextResponse.json({ success: true, cart });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load shopping bag";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { identity, setGuestCookieToken } = await resolveCartIdentity();
    if (setGuestCookieToken) {
      await ensureGuestCartCookie(setGuestCookieToken);
    }

    const body = await req.json();
    const { productId, variantId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const parsedQty = parseInt(String(quantity), 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      return NextResponse.json(
        { success: false, error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const updatedCart = await cartService.addItem(identity, {
      productId,
      variantId: variantId || null,
      quantity: parsedQty,
    });

    return NextResponse.json({
      success: true,
      message: "Added to shopping bag",
      cart: updatedCart,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add item to bag";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { identity, setGuestCookieToken } = await resolveCartIdentity();
    if (setGuestCookieToken) {
      await ensureGuestCartCookie(setGuestCookieToken);
    }

    const body = await req.json();
    const { itemId, quantity } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Item ID is required" },
        { status: 400 }
      );
    }

    const parsedQty = parseInt(String(quantity), 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      return NextResponse.json(
        { success: false, error: "Valid quantity is required" },
        { status: 400 }
      );
    }

    const updatedCart = await cartService.updateItemQuantity(identity, itemId, parsedQty);
    return NextResponse.json({ success: true, cart: updatedCart });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update item quantity";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { identity, setGuestCookieToken } = await resolveCartIdentity();
    if (setGuestCookieToken) {
      await ensureGuestCartCookie(setGuestCookieToken);
    }

    const url = new URL(req.url);
    const searchItemId = url.searchParams.get("itemId");
    const clearAll = url.searchParams.get("clear") === "true";

    let itemId = searchItemId;
    if (!itemId && !clearAll) {
      try {
        const body = await req.json();
        itemId = body.itemId;
      } catch {
        // no body provided
      }
    }

    if (clearAll) {
      const clearedCart = await cartService.clearCart(identity);
      return NextResponse.json({ success: true, cart: clearedCart });
    }

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Item ID or clear flag is required" },
        { status: 400 }
      );
    }

    const updatedCart = await cartService.removeItem(identity, itemId);
    return NextResponse.json({ success: true, cart: updatedCart });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove item";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
