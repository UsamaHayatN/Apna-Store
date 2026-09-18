import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getOrdersByUserId } from "@/lib/auth/user-store";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  // Retrieve strictly for the authenticated user ID (never trusts query parameter)
  const orders = await getOrdersByUserId(user.id);
  return NextResponse.json({ success: true, orders });
}
