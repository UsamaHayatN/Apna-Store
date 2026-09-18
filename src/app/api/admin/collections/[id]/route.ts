import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { collectionService } from "@/lib/collections/collection-service";
import { updateCollectionSchema } from "@/lib/validation/collection";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteProps) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "collections.read")) {
      return NextResponse.json({ error: "Forbidden: Missing collections.read permission" }, { status: 403 });
    }

    const { id } = await params;
    const collection = await collectionService.getCollectionById(id);

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: collection });
  } catch (error) {
    console.error("GET /api/admin/collections/[id] error:", error);
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

    if (!hasPermission(user.role, "collections.update")) {
      return NextResponse.json(
        { error: "Forbidden: Missing collections.update permission" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const parsed = updateCollectionSchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const updated = await collectionService.updateCollection(id, parsed.data, user.id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/admin/collections/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update collection" },
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
    console.error("DELETE /api/admin/collections/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to archive collection" },
      { status: 400 }
    );
  }
}
