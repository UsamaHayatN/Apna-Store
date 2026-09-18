import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { productService } from "@/lib/products/product-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "products.delete")) {
      return NextResponse.json(
        { error: "Forbidden: Missing products.delete permission to restore" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const restored = await productService.restoreProduct(id, user.id);

    return NextResponse.json({
      success: true,
      message: "Product restored to draft status",
      data: restored,
    });
  } catch (error) {
    console.error("POST /api/admin/products/[id]/restore error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
