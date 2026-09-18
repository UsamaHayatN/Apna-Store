import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { productService } from "@/lib/products/product-service";
import {
  createProductSchema,
  productQuerySchema,
} from "@/lib/validation/product";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "products.read")) {
      return NextResponse.json({ error: "Forbidden: Missing products.read permission" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const rawQuery = {
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || undefined,
      productType: searchParams.get("productType") || undefined,
      status: (searchParams.get("status") as "all" | "active" | "draft" | "archived") || "all",
      featured: searchParams.has("featured")
        ? searchParams.get("featured") === "true"
        : undefined,
      newArrival: searchParams.has("newArrival")
        ? searchParams.get("newArrival") === "true"
        : undefined,
      onSale: searchParams.has("onSale")
        ? searchParams.get("onSale") === "true"
        : undefined,
      sort: (searchParams.get("sort") as
        | "newest"
        | "oldest"
        | "name_asc"
        | "name_desc"
        | "price_asc"
        | "price_desc"
        | "updated") || "newest",
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 10,
    };

    const parsedQuery = productQuerySchema.parse(rawQuery);
    const result = await productService.getProducts(parsedQuery);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/admin/products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "products.create")) {
      return NextResponse.json(
        { error: "Forbidden: Missing products.create permission" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const product = await productService.createProduct(parsed.data, user.id);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
