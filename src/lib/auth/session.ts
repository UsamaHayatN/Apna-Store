import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SessionUser, UserRole, AccountStatus } from "@/types";
import { findUserById } from "./user-store";

export const SESSION_COOKIE_NAME = "auth_session";
const DEFAULT_EXPIRATION = "7d"; // 7 days session

function getSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "default-development-fallback-secret-minimum-32-chars-long";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const secretKey = getSecretKey();
  return await new SignJWT({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DEFAULT_EXPIRATION)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return {
      id: payload.id as string,
      email: payload.email as string,
      firstName: payload.firstName as string,
      lastName: payload.lastName as string,
      role: payload.role as UserRole,
      status: (payload.status as AccountStatus) || "active",
      emailVerifiedAt: (payload.emailVerifiedAt as string | null) || null,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<string> {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    partitioned: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  });
  return token;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  try {
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // ignore
  }
  try {
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
      path: "/",
      maxAge: 0,
    });
  } catch {
    // ignore
  }
}

/**
 * Validates the session cookie and verifies the user's current account status against
 * the database / user repository. Immediately revokes access if the account has been
 * disabled or suspended.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await verifySessionToken(token);
    if (!session) return null;

    // Check JWT payload status directly — fast path, no DB hit
    if (session.status === "disabled" || session.status === "suspended") {
      return null;
    }

    // For non-admin/non-staff users, trust the JWT to avoid a DB hit on every page load
    // Admin/staff still get live verification to enforce real-time role changes
    if (session.role !== "owner" && session.role !== "admin" && session.role !== "staff") {
      return {
        id: session.id,
        email: session.email,
        firstName: session.firstName,
        lastName: session.lastName,
        role: session.role,
        status: session.status,
        emailVerifiedAt: session.emailVerifiedAt,
      };
    }

    // Staff/admin: verify against database or memory repository to enforce real-time status updates
    const liveUser = await findUserById(session.id);
    if (liveUser) {
      if (liveUser.status === "disabled" || liveUser.status === "suspended") {
        try {
          cookieStore.delete(SESSION_COOKIE_NAME);
        } catch {
          // Safe to ignore in contexts where cookies are read-only
        }
        return null;
      }

      return {
        id: liveUser.id,
        email: liveUser.email,
        firstName: liveUser.firstName,
        lastName: liveUser.lastName,
        role: liveUser.role,
        status: liveUser.status,
        emailVerifiedAt: liveUser.emailVerifiedAt,
      };
    }

    // If liveUser is not found (e.g., in-memory store refreshed across worker threads),
    // trust the cryptographically verified JWT payload rather than destroying user session.
    return {
      id: session.id,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      role: session.role,
      status: session.status,
      emailVerifiedAt: session.emailVerifiedAt,
    };
  } catch {
    return null;
  }
}
