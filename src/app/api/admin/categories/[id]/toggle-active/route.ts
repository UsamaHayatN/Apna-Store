import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { categoryService } from "@/lib/categories/category-service";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
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
    const isActive = Boolean(body.isActive);

    const updated = await categoryService.toggleActive(id, isActive, user.id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("POST /api/admin/categories/[id]/toggle-active error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle status" },
      { status: 400 }
    );
  }
}
