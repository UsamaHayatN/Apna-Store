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

    if (!hasPermission(user.role, "collections.delete")) {
      return NextResponse.json(
        { error: "Forbidden: Missing collections.delete permission" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const result = await collectionService.archiveCollection(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/admin/collections/[id]/archive error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to archive collection" },
      { status: 400 }
    );
  }
}
