import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { inventoryService } from "@/lib/inventory/inventory-service";
import { adjustInventorySchema } from "@/lib/validation/inventory";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "inventory.update")) {
      return NextResponse.json(
        { error: "Forbidden: Missing inventory.update permission" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = adjustInventorySchema.parse(body);

    const result = await inventoryService.adjustStock({
      ...validated,
      performedByUserId: user.id,
      performedByName: `${user.firstName} ${user.lastName}`.trim(),
    });

    return NextResponse.json({
      success: true,
      message: "Stock successfully updated",
      item: result.item,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("POST /api/admin/inventory/adjust error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to adjust inventory" },
      { status: 400 }
    );
  }
}
