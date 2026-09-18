import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { getUserWithDetails } from "@/lib/auth/user-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("customers.read");
    const { id } = await params;

    const details = await getUserWithDetails(id);
    if (!details) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Do not leak passwordHash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeDetails } = details;

    return NextResponse.json({
      success: true,
      user: safeDetails,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { success: false, error: message },
      { status: 403 }
    );
  }
}
