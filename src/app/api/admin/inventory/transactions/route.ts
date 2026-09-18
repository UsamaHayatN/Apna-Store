import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { inventoryService } from "@/lib/inventory/inventory-service";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "inventory.read")) {
      return NextResponse.json(
        { error: "Forbidden: Missing inventory.read permission" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get("variantId") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 50;

    const transactions = await inventoryService.getTransactions({
      variantId,
      limit,
    });

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error("GET /api/admin/inventory/transactions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
