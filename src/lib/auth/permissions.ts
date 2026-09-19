import { PermissionCode, UserRole } from "@/types";

/**
 * Granular Role-to-Permission Matrix.
 * Enforces least-privilege access control across customer, staff, admin, and owner tiers.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly PermissionCode[]> = {
  owner: [
    "products.read",
    "products.create",
    "products.update",
    "products.delete",
    "categories.read",
    "categories.create",
    "categories.update",
    "categories.delete",
    "collections.read",
    "collections.create",
    "collections.update",
    "collections.delete",
    "inventory.read",
    "inventory.update",
    "orders.read",
    "orders.update",
    "orders.delete",
    "customers.read",
    "customers.update",
    "coupons.read",
    "coupons.create",
    "coupons.update",
    "coupons.delete",
    "settings.read",
    "settings.update",
    "users.read",
    "users.create",
    "users.update",
    "users.delete",
    "roles.read",
    "roles.update",
    "audit.read",
  ],
  admin: [
    "products.read",
    "products.create",
    "products.update",
    "products.delete",
    "categories.read",
    "categories.create",
    "categories.update",
    "categories.delete",
    "collections.read",
    "collections.create",
    "collections.update",
    "collections.delete",
    "inventory.read",
    "inventory.update",
    "orders.read",
    "orders.update",
    "customers.read",
    "customers.update",
    "coupons.read",
    "coupons.create",
    "coupons.update",
    "coupons.delete",
    "settings.read",
    "users.read",
    "users.create", // Can invite/create staff members
    "audit.read",
  ],
  staff: [
    "products.read",
    "products.create",
    "products.update",
    "categories.read",
    "categories.create",
    "categories.update",
    "collections.read",
    "collections.create",
    "collections.update",
    "inventory.read",
    "inventory.update",
    "orders.read",
    "orders.update",
    "customers.read",
    "coupons.read",
    "coupons.create",
    "coupons.update",
  ],
  customer: [],
};

/**
 * Determines whether a given user role possesses a specific granular permission.
 */
export function hasPermission(role: UserRole, permission: PermissionCode): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

/**
 * Retrieves all permissions granted to a given user role.
 */
export function getPermissionsForRole(role: UserRole): readonly PermissionCode[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Checks if a user role is authorized to perform administrative operations.
 */
export function isAdminOrStaff(role: UserRole): boolean {
  return role === "owner" || role === "admin" || role === "staff";
}

/**
 * Hierarchy weights used to prevent privilege escalation.
 * A user with a lower rank can never assign, alter, or elevate to a rank >= their own.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  customer: 10,
  staff: 50,
  admin: 80,
  owner: 100,
};

/**
 * Validates whether an acting user role is allowed to assign or alter a target role.
 * Rules:
 * - Only 'owner' or 'admin' can manage users.
 * - 'admin' can only create or update 'staff' and 'customer' roles (cannot create 'admin' or 'owner').
 * - No user can assign a role higher than or equal to their own (except 'owner' who can manage all).
 * - No user can demote or alter an 'owner' except another 'owner'.
 */
export function canAssignRole(actingRole: UserRole, targetRole: UserRole): boolean {
  if (actingRole === "owner") return true;
  if (actingRole === "admin") {
    return targetRole === "staff" || targetRole === "customer";
  }
  return false;
}

/**
 * Validates whether an acting user role is allowed to modify an existing user's record.
 */
export function canModifyUserWithRole(actingRole: UserRole, targetUserRole: UserRole): boolean {
  if (actingRole === "owner") return true;
  if (actingRole === "admin") {
    // Admin cannot modify owners or other admins
    return targetUserRole === "staff" || targetUserRole === "customer";
  }
  return false;
}
