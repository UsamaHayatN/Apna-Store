import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { categoryService } from "@/lib/categories/category-service";
import { categorySchema } from "@/lib/validation/category";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "categories.read")) {
      return NextResponse.json({ error: "Forbidden: Missing categories.read permission" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const asTree = searchParams.get("tree") === "true";
    const includeInactive = searchParams.get("includeInactive") !== "false";
    const includeArchived = searchParams.get("includeArchived") === "true";
    const search = searchParams.get("search") || undefined;
    const parentIdParam = searchParams.get("parentId");
    const parentId = parentIdParam === "null" ? null : parentIdParam || undefined;

    if (asTree) {
      const tree = await categoryService.getCategoryTree({ includeInactive, includeArchived });
      return NextResponse.json({ success: true, data: tree });
    }

    const categories = await categoryService.listCategories({
      includeInactive,
      includeArchived,
      search,
      parentId,
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("GET /api/admin/categories error:", error);
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

    if (!hasPermission(user.role, "categories.create")) {
      return NextResponse.json(
        { error: "Forbidden: Missing categories.create permission" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const created = await categoryService.createCategory(parsed.data, user.id);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/categories error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create category" },
      { status: 400 }
    );
  }
}
