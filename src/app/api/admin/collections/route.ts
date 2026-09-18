import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { collectionService } from "@/lib/collections/collection-service";
import { collectionSchema } from "@/lib/validation/collection";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "collections.read")) {
      return NextResponse.json({ error: "Forbidden: Missing collections.read permission" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as "all" | "published" | "draft" | "archived") || "all";
    const isFeatured = searchParams.has("isFeatured") ? searchParams.get("isFeatured") === "true" : undefined;
    const sort = (searchParams.get("sort") as "title-asc" | "title-desc" | "products-desc" | "created-desc" | "sort-order") || "sort-order";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await collectionService.listCollections({
      search,
      status,
      isFeatured,
      sort,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("GET /api/admin/collections error:", error);
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

    if (!hasPermission(user.role, "collections.create")) {
      return NextResponse.json(
        { error: "Forbidden: Missing collections.create permission" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = collectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const created = await collectionService.createCollection(parsed.data, user.id);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/collections error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create collection" },
      { status: 400 }
    );
  }
}
