import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { categoryService } from "@/lib/categories/category-service";
import { updateCategorySchema } from "@/lib/validation/category";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteProps) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "categories.read")) {
      return NextResponse.json({ error: "Forbidden: Missing categories.read permission" }, { status: 403 });
    }

    const { id } = await params;
    const category = await categoryService.getCategoryById(id);

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("GET /api/admin/categories/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteProps) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "categories.update")) {
      return NextResponse.json(
        { error: "Forbidden: Missing categories.update permission" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const parsed = updateCategorySchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const updated = await categoryService.updateCategory(id, parsed.data, user.id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/admin/categories/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update category" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "categories.delete")) {
      return NextResponse.json(
        { error: "Forbidden: Missing categories.delete permission" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const result = await categoryService.archiveCategory(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE /api/admin/categories/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to archive category" },
      { status: 400 }
    );
  }
}
