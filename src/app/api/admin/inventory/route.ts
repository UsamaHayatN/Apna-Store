import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { inventoryService } from "@/lib/inventory/inventory-service";
import { inventoryFilterSchema } from "@/lib/validation/inventory";

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
    const rawFilter = {
      query: searchParams.get("query") || "",
      status: (searchParams.get("status") as any) || "all",
      sortBy: (searchParams.get("sortBy") as any) || "title",
      sortOrder: (searchParams.get("sortOrder") as any) || "asc",
    };

    const parsedFilter = inventoryFilterSchema.parse(rawFilter);
    const result = await inventoryService.listInventory(parsedFilter);

    return NextResponse.json({
      success: true,
      items: result.items,
      stats: result.stats,
    });
  } catch (error) {
    console.error("GET /api/admin/inventory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
