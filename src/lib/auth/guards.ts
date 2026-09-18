import { redirect } from "next/navigation";
import { getSessionUser } from "./session";
import { SessionUser, UserRole, PermissionCode } from "@/types";
import { hasPermission, isAdminOrStaff } from "./permissions";

export class UnauthorizedError extends Error {
  constructor(message: string = "Authentication required. Please sign in.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Access denied. Insufficient permissions.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class AccountDisabledError extends Error {
  constructor(message: string = "Account suspended or disabled. Please contact concierge.") {
    super(message);
    this.name = "AccountDisabledError";
  }
}

/**
 * Ensures the requesting client is authenticated.
 * Used in server components, layouts, or server actions.
 */
export async function requireUser(redirectUrl?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    if (redirectUrl) {
      if (redirectUrl.startsWith("/admin")) {
        redirect(redirectUrl);
      } else {
        redirect(`/account?redirect=${encodeURIComponent(redirectUrl)}`);
      }
    }
    throw new UnauthorizedError();
  }

  if (user.status === "disabled" || user.status === "suspended") {
    throw new AccountDisabledError();
  }

  return user;
}

/**
 * Ensures the requesting client has one of the allowed roles.
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectUrl?: string
): Promise<SessionUser> {
  const user = await requireUser(redirectUrl);

  if (!allowedRoles.includes(user.role)) {
    if (redirectUrl) {
      redirect(
        isAdminOrStaff(user.role)
          ? "/admin?error=forbidden"
          : "/account?error=forbidden"
      );
    }
    throw new ForbiddenError(
      `Role '${user.role}' is not authorized for this operation.`
    );
  }

  return user;
}

/**
 * Enforces a specific granular permission server-side.
 */
export async function requirePermission(
  permission: PermissionCode,
  redirectUrl?: string
): Promise<SessionUser> {
  const user = await requireUser(redirectUrl);

  if (!hasPermission(user.role, permission)) {
    if (redirectUrl) {
      redirect("/admin?error=forbidden");
    }
    throw new ForbiddenError(
      `Role '${user.role}' lacks the required permission: '${permission}'`
    );
  }

  return user;
}

/**
 * Requires an administrative or staff role ('owner', 'admin', or 'staff').
 */
export async function requireAdminOrStaff(redirectUrl: string = "/admin/login"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`${redirectUrl}?redirect=${encodeURIComponent("/admin")}`);
  }

  if (!isAdminOrStaff(user.role)) {
    redirect("/admin/login?error=restricted");
  }

  if (user.status === "disabled" || user.status === "suspended") {
    redirect("/admin/login?error=disabled");
  }

  return user;
}

/**
 * Requires full Store Administrator or Owner privileges.
 */
export async function requireAdmin(): Promise<SessionUser> {
  return await requireRole(["admin", "owner"]);
}

/**
 * Requires Store Owner (super-administrator) privileges.
 */
export async function requireOwner(): Promise<SessionUser> {
  return await requireRole(["owner"]);
}

/**
 * Prevents Insecure Direct Object References (IDOR).
 * Verifies that the requested resource belongs to the current user,
 * OR allows elevated staff/admin roles to view/manage customer records.
 */
export async function requireOwnership(
  resourceOwnerUserId: string,
  user?: SessionUser | null
): Promise<SessionUser> {
  const currentUser = user || (await requireUser());

  // Admins and owners can inspect user resources
  if (currentUser.role === "admin" || currentUser.role === "owner") {
    return currentUser;
  }

  if (currentUser.id !== resourceOwnerUserId) {
    throw new ForbiddenError(
      "You do not possess permission to access or modify this customer resource."
    );
  }

  return currentUser;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return await getSessionUser();
}
