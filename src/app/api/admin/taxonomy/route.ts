import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { productService } from "@/lib/products/product-service";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "products.read")) {
      return NextResponse.json(
        { error: "Forbidden: Missing products.read permission" },
        { status: 403 }
      );
    }

    const [categories, productTypes] = await Promise.all([
      productService.getCategories(),
      productService.getProductTypes(),
    ]);

    return NextResponse.json({
      categories,
      productTypes,
    });
  } catch (error) {
    console.error("GET /api/admin/taxonomy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
