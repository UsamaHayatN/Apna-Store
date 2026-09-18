import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getOrderById } from "@/lib/auth/user-store";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  // IDOR Protection: strictly verify ownership or staff/admin elevation
  const isOwnerOrAdmin = user.role === "owner" || user.role === "admin";
  if (order.userId !== user.id && !isOwnerOrAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden: You are not authorized to access this customer order.",
        code: "IDOR_FORBIDDEN",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, order });
}
