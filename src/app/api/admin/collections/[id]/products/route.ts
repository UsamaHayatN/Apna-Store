import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { collectionService } from "@/lib/collections/collection-service";
import {
  collectionProductAssignmentSchema,
  reorderCollectionProductsSchema,
} from "@/lib/validation/collection";

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
    const products = await collectionService.getCollectionProducts(id);
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("GET /api/admin/collections/[id]/products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteProps) {
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

    const parsed = collectionProductAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await collectionService.addProductToCollection(
      id,
      parsed.data.productId,
      parsed.data.sortOrder,
      user.id
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/collections/[id]/products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add product to collection" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
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
    const { searchParams } = new URL(req.url);
    let productId = searchParams.get("productId");

    if (!productId) {
      try {
        const body = await req.json();
        productId = body.productId;
      } catch {
        // no body
      }
    }

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const result = await collectionService.removeProductFromCollection(id, productId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE /api/admin/collections/[id]/products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove product from collection" },
      { status: 400 }
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

    const parsed = reorderCollectionProductsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await collectionService.reorderCollectionProducts(
      id,
      parsed.data.productIds,
      user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("PUT /api/admin/collections/[id]/products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reorder products" },
      { status: 400 }
    );
  }
}
