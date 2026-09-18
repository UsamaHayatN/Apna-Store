import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { inventoryService } from "@/lib/inventory/inventory-service";
import { updateInventorySettingsSchema } from "@/lib/validation/inventory";

interface RouteParams {
  params: Promise<{ variantId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const { variantId } = await params;
    const item = await inventoryService.getInventoryItem(variantId);

    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("GET /api/admin/inventory/[variantId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    const { variantId } = await params;
    const body = await req.json();
    const validated = updateInventorySettingsSchema.parse({
      ...body,
      variantId,
    });

    const updated = await inventoryService.updateSettings(variantId, {
      ...validated,
      performedByUserId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Inventory settings updated",
      item: updated,
    });
  } catch (error) {
    console.error("PATCH /api/admin/inventory/[variantId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 400 }
    );
  }
}
