import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPermissionsForRole } from "@/lib/auth/permissions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const permissions = getPermissionsForRole(user.role);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      permissions,
    },
  });
}
