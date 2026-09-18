import {
  AuthUser,
  SessionUser,
  UserRole,
  AccountStatus,
} from "@/types";
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  savePasswordResetToken,
  findValidPasswordResetToken,
  invalidatePasswordResetToken,
  saveEmailVerificationToken,
  findValidEmailVerificationToken,
  invalidateEmailVerificationToken,
} from "./user-store";
import { hashPassword, verifyPassword } from "./password";
import { generateSecureToken, hashToken } from "./tokens";
import { setSessionCookie, clearSessionCookie } from "./session";
import { recordAuditLog } from "./audit";
import { checkRateLimit, resetRateLimit } from "./rate-limiter";
import { hasPermission, canAssignRole, canModifyUserWithRole, isAdminOrStaff } from "./permissions";
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ProfileUpdateInput,
  ChangePasswordInput,
  AdminCreateStaffInput,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileUpdateSchema,
  changePasswordSchema,
  adminCreateStaffSchema,
} from "@/lib/validation";

export class AuthError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = "AUTH_ERROR", statusCode: number = 400) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Registers a new customer storefront account.
 * Enforces server-side field validation, password strength, duplicate email checks,
 * and PBKDF2 salt hashing. Never trusts client role assignment.
 */
export async function registerCustomer(
  rawInput: RegisterInput,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: SessionUser; verificationToken?: string }> {
  // 1. Validate Schema
  const parseResult = registerSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid registration data";
    throw new AuthError(firstError, "VALIDATION_ERROR", 400);
  }
  const input = parseResult.data;

  // 2. Rate Limiting
  const rateKey = ipAddress || "global";
  const rateLimit = checkRateLimit("register", rateKey);
  if (!rateLimit.success) {
    throw new AuthError(
      `Too many registration attempts. Please retry in ${rateLimit.retryAfterSeconds} seconds.`,
      "RATE_LIMITED",
      429
    );
  }

  // 3. Duplicate Email Check
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new AuthError(
      "An account with this email address already exists.",
      "EMAIL_EXISTS",
      409
    );
  }

  // 4. Hash Password with PBKDF2
  const passwordHash = await hashPassword(input.password);

  // 5. Generate Email Verification Token
  const rawVerificationToken = generateSecureToken();
  const tokenHash = hashToken(rawVerificationToken);
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // 6. Create User in Repository (Role is strictly forced to 'customer')
  const createdUser = await createUser({
    email: normalizedEmail,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone || null,
    role: "customer", // Strict server-side assignment
    status: "active",
    emailVerifiedAt: null,
  });

  // 7. Store Verification Token
  await saveEmailVerificationToken(createdUser.id, tokenHash, tokenExpiresAt);

  // 8. Log Security Audit
  await recordAuditLog({
    userId: createdUser.id,
    action: "auth.register",
    entityType: "user",
    entityId: createdUser.id,
    changes: {
      email: normalizedEmail,
      role: "customer",
      status: "active",
    },
    ipAddress,
    userAgent,
  });

  const sessionUser: SessionUser = {
    id: createdUser.id,
    email: createdUser.email,
    firstName: createdUser.firstName,
    lastName: createdUser.lastName,
    role: createdUser.role,
    status: createdUser.status,
    emailVerifiedAt: createdUser.emailVerifiedAt,
  };

  return {
    user: sessionUser,
    verificationToken: rawVerificationToken,
  };
}

/**
 * Authenticates credentials for customers or staff.
 * Mitigates timing attacks and brute-force attempts.
 */
export async function authenticateCredentials(
  rawInput: LoginInput,
  options: {
    requireStaffPortal?: boolean;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<SessionUser> {
  const { requireStaffPortal = false, ipAddress, userAgent } = options;

  // 1. Validate Schema
  const parseResult = loginSchema.safeParse(rawInput);
  if (!parseResult.success) {
    throw new AuthError("Please provide a valid email and password.", "VALIDATION_ERROR", 400);
  }
  const { email, password } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();

  // 2. Rate Limiting per (IP + Email)
  const rateKey = `${ipAddress || "client"}:${normalizedEmail}`;
  const rateLimit = checkRateLimit("login", rateKey);
  if (!rateLimit.success) {
    throw new AuthError(
      `Too many login attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
      "RATE_LIMITED",
      429
    );
  }

  // 3. User Lookup
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    // Constant-time dummy verification to thwart user enumeration via timing attack
    const dummyHash =
      "e28fa75ba8d145c290a1b2c3d4e5f607:44f06cb752643a165cf45a1fcf1fe73ff4d03d014bc0891d4e3aa12d09d3da146d9b99fc964821a37c358485292416b732ce53d53a9e22306786c757c91d4285";
    await verifyPassword(password, dummyHash);

    await recordAuditLog({
      action: "auth.login_failed",
      entityType: "user",
      entityId: normalizedEmail,
      changes: { reason: "nonexistent_account" },
      ipAddress,
      userAgent,
    });

    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS", 401);
  }

  // 4. Verify Password Hash
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    await recordAuditLog({
      userId: user.id,
      action: "auth.login_failed",
      entityType: "user",
      entityId: user.id,
      changes: { reason: "invalid_password" },
      ipAddress,
      userAgent,
    });

    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS", 401);
  }

  // 5. Account Status Check (Suspended or Disabled)
  if (user.status === "disabled" || user.status === "suspended") {
    await recordAuditLog({
      userId: user.id,
      action: "auth.login_blocked",
      entityType: "user",
      entityId: user.id,
      changes: { status: user.status },
      ipAddress,
      userAgent,
    });

    throw new AuthError(
      "Your account has been suspended or disabled. Please contact customer concierge.",
      "ACCOUNT_DISABLED",
      403
    );
  }

  // 6. Admin Portal Restriction
  if (requireStaffPortal && !isAdminOrStaff(user.role)) {
    await recordAuditLog({
      userId: user.id,
      action: "auth.admin_access_denied",
      entityType: "user",
      entityId: user.id,
      changes: { role: user.role },
      ipAddress,
      userAgent,
    });

    throw new AuthError(
      "Access denied. This management console is restricted to authorized personnel.",
      "FORBIDDEN",
      403
    );
  }

  // 7. Update Last Login & Reset Rate Limiter
  resetRateLimit("login", rateKey);
  await updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  // 8. Log Successful Authentication
  await recordAuditLog({
    userId: user.id,
    action: "auth.login_success",
    entityType: "user",
    entityId: user.id,
    changes: { role: user.role, portal: requireStaffPortal ? "admin" : "storefront" },
    ipAddress,
    userAgent,
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

/**
 * Initiates the password recovery flow.
 * Generates an unguessable reset token and stores its SHA-256 hash.
 * Returns a generic success response to prevent email enumeration.
 */
export async function requestPasswordReset(
  rawInput: ForgotPasswordInput,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; message: string; devResetToken?: string }> {
  const parseResult = forgotPasswordSchema.safeParse(rawInput);
  if (!parseResult.success) {
    throw new AuthError("Please provide a valid email address.", "VALIDATION_ERROR", 400);
  }
  const { email } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();

  // Rate limit reset requests
  const rateLimit = checkRateLimit("forgot_password", ipAddress || normalizedEmail);
  if (!rateLimit.success) {
    throw new AuthError(
      `Too many reset requests. Please retry in ${rateLimit.retryAfterSeconds} seconds.`,
      "RATE_LIMITED",
      429
    );
  }

  const genericSuccessMessage =
    "If an account exists with this email address, a password reset link has been dispatched.";

  const user = await findUserByEmail(normalizedEmail);
  if (!user || user.status === "disabled") {
    // Return identical message so callers cannot probe account existence
    return { success: true, message: genericSuccessMessage };
  }

  // Generate high-entropy token and hash it
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await savePasswordResetToken(user.id, tokenHash, expiresAt);

  await recordAuditLog({
    userId: user.id,
    action: "auth.password_reset_requested",
    entityType: "user",
    entityId: user.id,
    changes: { email: normalizedEmail },
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    message: genericSuccessMessage,
    devResetToken: rawToken, // For testing and verification
  };
}

/**
 * Validates reset token and applies the new password.
 */
export async function completePasswordReset(
  rawInput: ResetPasswordInput,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; message: string }> {
  const parseResult = resetPasswordSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message || "Invalid password reset request";
    throw new AuthError(msg, "VALIDATION_ERROR", 400);
  }
  const { token, newPassword } = parseResult.data;

  // Rate limit
  const rateLimit = checkRateLimit("reset_password", ipAddress || "global");
  if (!rateLimit.success) {
    throw new AuthError(
      `Too many attempts. Please retry in ${rateLimit.retryAfterSeconds} seconds.`,
      "RATE_LIMITED",
      429
    );
  }

  const tokenHash = hashToken(token);
  const resetRecord = await findValidPasswordResetToken(tokenHash);

  if (!resetRecord) {
    throw new AuthError(
      "The password reset link is invalid or has expired. Please request a new one.",
      "INVALID_TOKEN",
      400
    );
  }

  const newHash = await hashPassword(newPassword);
  await updateUser(resetRecord.userId, { passwordHash: newHash });
  await invalidatePasswordResetToken(resetRecord.id);

  await recordAuditLog({
    userId: resetRecord.userId,
    action: "auth.password_reset_completed",
    entityType: "user",
    entityId: resetRecord.userId,
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    message: "Your password has been successfully updated. You may now sign in.",
  };
}

/**
 * Validates email verification token.
 */
export async function completeEmailVerification(
  rawToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; message: string }> {
  const tokenHash = hashToken(rawToken);
  const tokenRecord = await findValidEmailVerificationToken(tokenHash);

  if (!tokenRecord) {
    throw new AuthError(
      "The email verification link is invalid or has expired.",
      "INVALID_TOKEN",
      400
    );
  }

  const verifiedAtIso = new Date().toISOString();
  await updateUser(tokenRecord.userId, { emailVerifiedAt: verifiedAtIso });
  await invalidateEmailVerificationToken(tokenRecord.id);

  await recordAuditLog({
    userId: tokenRecord.userId,
    action: "auth.email_verified",
    entityType: "user",
    entityId: tokenRecord.userId,
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    message: "Your email address has been verified successfully.",
  };
}

/**
 * Updates customer profile details (name, phone).
 * Rejects any client-supplied role or status properties.
 */
export async function updateCustomerProfile(
  userId: string,
  rawInput: ProfileUpdateInput
): Promise<SessionUser> {
  const parseResult = profileUpdateSchema.safeParse(rawInput);
  if (!parseResult.success) {
    throw new AuthError(parseResult.error.issues[0]?.message || "Invalid profile data");
  }
  const input = parseResult.data;

  const updated = await updateUser(userId, {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone || null,
  });

  if (!updated) {
    throw new AuthError("User not found", "NOT_FOUND", 404);
  }

  return {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    role: updated.role,
    status: updated.status,
    emailVerifiedAt: updated.emailVerifiedAt,
  };
}

/**
 * Updates customer password after verifying existing password.
 */
export async function changeCustomerPassword(
  userId: string,
  rawInput: ChangePasswordInput,
  ipAddress?: string
): Promise<void> {
  const parseResult = changePasswordSchema.safeParse(rawInput);
  if (!parseResult.success) {
    throw new AuthError(parseResult.error.issues[0]?.message || "Invalid password change data");
  }
  const { currentPassword, newPassword } = parseResult.data;

  const user = await findUserById(userId);
  if (!user) {
    throw new AuthError("User not found", "NOT_FOUND", 404);
  }

  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) {
    throw new AuthError("Current password incorrect.", "INVALID_CURRENT_PASSWORD", 400);
  }

  const newHash = await hashPassword(newPassword);
  await updateUser(userId, { passwordHash: newHash });

  await recordAuditLog({
    userId,
    action: "auth.password_change",
    entityType: "user",
    entityId: userId,
    ipAddress,
  });
}

/**
 * Administrator action: Creates a new staff or admin user.
 * Strictly prevents privilege escalation.
 */
export async function adminCreateStaffUser(
  actingUser: SessionUser,
  rawInput: AdminCreateStaffInput,
  ipAddress?: string
): Promise<AuthUser> {
  // Check permission
  if (!hasPermission(actingUser.role, "users.create")) {
    throw new AuthError("You lack permission to create team members.", "FORBIDDEN", 403);
  }

  const parseResult = adminCreateStaffSchema.safeParse(rawInput);
  if (!parseResult.success) {
    throw new AuthError(parseResult.error.issues[0]?.message || "Invalid staff details");
  }
  const input = parseResult.data;

  // Prevent privilege escalation
  if (!canAssignRole(actingUser.role, input.role)) {
    throw new AuthError(
      `Role '${actingUser.role}' is not authorized to assign the '${input.role}' role.`,
      "PRIVILEGE_ESCALATION",
      403
    );
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new AuthError("A user with this email already exists.", "EMAIL_EXISTS", 409);
  }

  const passwordHash = await hashPassword(input.temporaryPassword);

  const newUser = await createUser({
    email: normalizedEmail,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone || null,
    role: input.role,
    status: "active",
    emailVerifiedAt: new Date().toISOString(),
  });

  await recordAuditLog({
    userId: actingUser.id,
    action: "admin.staff_created",
    entityType: "user",
    entityId: newUser.id,
    changes: {
      email: normalizedEmail,
      assignedRole: input.role,
    },
    ipAddress,
  });

  return newUser;
}

/**
 * Administrator action: Updates an existing user's role.
 * Prevents non-owners from assigning owner or admin roles.
 */
export async function adminUpdateUserRole(
  actingUser: SessionUser,
  targetUserId: string,
  newRole: UserRole,
  ipAddress?: string
): Promise<AuthUser> {
  if (!hasPermission(actingUser.role, "roles.update")) {
    throw new AuthError("You lack permission to modify user roles.", "FORBIDDEN", 403);
  }

  // Prevent self-role modification (cannot elevate own role)
  if (actingUser.id === targetUserId) {
    throw new AuthError("You cannot alter your own role privileges.", "FORBIDDEN", 403);
  }

  const targetUser = await findUserById(targetUserId);
  if (!targetUser) {
    throw new AuthError("Target user not found.", "NOT_FOUND", 404);
  }

  // Prevent non-owners from modifying owner accounts
  if (!canModifyUserWithRole(actingUser.role, targetUser.role)) {
    throw new AuthError("Cannot modify permissions of a higher-tier administrator.", "FORBIDDEN", 403);
  }

  // Prevent assigning a role that acting user is not authorized to assign
  if (!canAssignRole(actingUser.role, newRole)) {
    throw new AuthError(
      `Role '${actingUser.role}' cannot assign the role '${newRole}'.`,
      "PRIVILEGE_ESCALATION",
      403
    );
  }

  const updated = await updateUser(targetUserId, { role: newRole });
  if (!updated) {
    throw new AuthError("Failed to update user role", "NOT_FOUND", 404);
  }

  await recordAuditLog({
    userId: actingUser.id,
    action: "admin.role_updated",
    entityType: "user",
    entityId: targetUserId,
    changes: {
      previousRole: targetUser.role,
      newRole,
    },
    ipAddress,
  });

  return updated;
}

/**
 * Administrator action: Updates user status (active, suspended, disabled).
 */
export async function adminUpdateUserStatus(
  actingUser: SessionUser,
  targetUserId: string,
  newStatus: AccountStatus,
  ipAddress?: string
): Promise<AuthUser> {
  if (!hasPermission(actingUser.role, "users.update")) {
    throw new AuthError("You lack permission to alter user status.", "FORBIDDEN", 403);
  }

  if (actingUser.id === targetUserId) {
    throw new AuthError("You cannot suspend or disable your own account.", "FORBIDDEN", 403);
  }

  const targetUser = await findUserById(targetUserId);
  if (!targetUser) {
    throw new AuthError("Target user not found.", "NOT_FOUND", 404);
  }

  if (targetUser.role === "owner" && actingUser.role !== "owner") {
    throw new AuthError("Only a store owner may alter the status of another owner.", "FORBIDDEN", 403);
  }

  const updated = await updateUser(targetUserId, { status: newStatus });
  if (!updated) {
    throw new AuthError("Failed to update user status", "NOT_FOUND", 404);
  }

  await recordAuditLog({
    userId: actingUser.id,
    action: "admin.status_updated",
    entityType: "user",
    entityId: targetUserId,
    changes: {
      previousStatus: targetUser.status,
      newStatus,
    },
    ipAddress,
  });

  return updated;
}
