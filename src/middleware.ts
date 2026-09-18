import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "auth_session";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "default-development-fallback-secret-minimum-32-chars-long";
  return new TextEncoder().encode(secret);
}

interface DecodedSession {
  id: string;
  email: string;
  role: string;
  status: string;
}

async function verifyToken(token: string): Promise<DecodedSession | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as string,
      status: (payload.status as string) || "active",
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const session = token ? await verifyToken(token) : null;
  const isAuthenticated = !!session && session.status !== "disabled" && session.status !== "suspended";
  const isStaffOrAdmin =
    isAuthenticated &&
    (session?.role === "owner" || session?.role === "admin" || session?.role === "staff");

  // =============================================================================
  // 1. ADMIN ROUTE PROTECTION
  // =============================================================================
  if (pathname.startsWith("/admin")) {
    // If accessing the admin login page
    if (pathname === "/admin/login") {
      // If already authenticated as staff or admin, redirect directly to admin dashboard
      if (isStaffOrAdmin) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    // All other /admin routes require authenticated staff/admin
    if (!isAuthenticated) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isStaffOrAdmin) {
      // A regular customer attempting to access the admin portal
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "restricted");
      return NextResponse.redirect(loginUrl);
    }
  }

  // =============================================================================
  // 2. CUSTOMER ACCOUNT SUB-ROUTES PROTECTION
  // =============================================================================
  const protectedCustomerRoutes = [
    "/account/orders",
    "/account/addresses",
    "/account/profile",
    "/account/settings",
    "/account/wishlist",
  ];

  const isProtectedCustomerRoute = protectedCustomerRoutes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isProtectedCustomerRoute && !isAuthenticated) {
    const accountUrl = new URL("/account", request.url);
    accountUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(accountUrl);
  }

  // Forward diagnostic and auth headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  if (session) {
    requestHeaders.set("x-user-id", session.id);
    requestHeaders.set("x-user-role", session.role);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (handled directly by API route handlers)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
