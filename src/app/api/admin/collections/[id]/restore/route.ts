import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { collectionService } from "@/lib/collections/collection-service";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteProps) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "collections.update")) {
      return NextResponse.json(
        { error: "Forbidden: Missing collections.update permission" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const restored = await collectionService.restoreCollection(id, user.id);
    return NextResponse.json({ success: true, data: restored });
  } catch (error) {
    console.error("POST /api/admin/collections/[id]/restore error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore collection" },
      { status: 400 }
    );
  }
}
