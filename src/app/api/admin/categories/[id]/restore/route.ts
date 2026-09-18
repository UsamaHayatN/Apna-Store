import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { categoryService } from "@/lib/categories/category-service";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteProps) {
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
    const restored = await categoryService.restoreCategory(id, user.id);
    return NextResponse.json({ success: true, data: restored });
  } catch (error) {
    console.error("POST /api/admin/categories/[id]/restore error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore category" },
      { status: 400 }
    );
  }
}
