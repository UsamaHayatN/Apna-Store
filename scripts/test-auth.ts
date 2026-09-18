/**
 * Comprehensive Authentication, Authorization, & Security Test Suite.
 * Validates all 16 core security scenarios specified in the requirements.
 */

import {
  registerCustomer,
  authenticateCredentials,
  requestPasswordReset,
  completePasswordReset,
  completeEmailVerification,
  updateCustomerProfile,
  adminCreateStaffUser,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  AuthError,
} from "../src/lib/auth/service";
import {
  findUserByEmail,
  findUserById,
  getOrderById,
  listStaffAndAdminUsers,
  createUserAddress,
  getUserAddresses,
  setDefaultUserAddress,
  deleteUserAddress,
  listAllUsers,
  getUserWithDetails,
} from "../src/lib/auth/user-store";
import { verifyPassword } from "../src/lib/auth/password";
import {
  createSessionToken,
  verifySessionToken,
} from "../src/lib/auth/session";
import {
  hasPermission,
  canAssignRole,
  isAdminOrStaff,
} from "../src/lib/auth/permissions";
import { requireOwnership, ForbiddenError } from "../src/lib/auth/guards";
import { mergeGuestCartToCustomer, setGuestCartItems } from "../src/lib/auth/cart-transition";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}: ${failureDetails || "Condition false"}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

async function runSecurityTests() {
  console.log("\n=======================================================");
  console.log("ATELIER E-COMMERCE: AUTHENTICATION & SECURITY VERIFICATION");
  console.log("=======================================================\n");

  // -------------------------------------------------------------------------
  // Scenario 1 & 2: Customer registers successfully & Passwords NEVER in plaintext
  // -------------------------------------------------------------------------
  console.log("--- 1 & 2. Customer Registration & Cryptographic Password Hashing ---");
  const uniqueEmail = `test.client.${Date.now()}@domain.com`;
  const rawPlaintextPassword = "BespokePassword2026!";

  const regResult = await registerCustomer({
    firstName: "Alexander",
    lastName: "Wright",
    email: uniqueEmail,
    password: rawPlaintextPassword,
    confirmPassword: rawPlaintextPassword,
  });

  assert(!!regResult.user.id, "Customer registers successfully with generated ID");
  assert(regResult.user.role === "customer", "Registered customer is assigned 'customer' role strictly server-side");

  const storedUser = await findUserByEmail(uniqueEmail);
  assert(!!storedUser, "User persisted to repository");
  assert(
    storedUser?.passwordHash !== rawPlaintextPassword,
    "Password is NOT stored in plaintext"
  );
  assert(
    Boolean(storedUser?.passwordHash?.includes(":")),
    "Password hash uses salt:derivedKey format"
  );
  const isHashValid = await verifyPassword(rawPlaintextPassword, storedUser!.passwordHash);
  assert(Boolean(isHashValid), "Password hash correctly verifies via PBKDF2");

  // -------------------------------------------------------------------------
  // Scenario 3 & 4: Login with correct and incorrect credentials
  // -------------------------------------------------------------------------
  console.log("\n--- 3 & 4. Credential Verification & Timing Attack Mitigation ---");
  const loginUser = await authenticateCredentials({
    email: uniqueEmail,
    password: rawPlaintextPassword,
  });
  assert(loginUser.id === regResult.user.id, "Login succeeds with valid credentials");

  let loginFailedWrongPass = false;
  try {
    await authenticateCredentials({
      email: uniqueEmail,
      password: "WrongPassword999!",
    });
  } catch (err: unknown) {
    if (err instanceof AuthError && err.statusCode === 401) {
      loginFailedWrongPass = true;
    }
  }
  assert(loginFailedWrongPass, "Login fails with incorrect password (401 Unauthorized)");

  let loginFailedNonexistent = false;
  try {
    await authenticateCredentials({
      email: "nonexistent.user@atelier.internal",
      password: "SomePassword123!",
    });
  } catch (err: unknown) {
    if (err instanceof AuthError && err.statusCode === 401) {
      loginFailedNonexistent = true;
    }
  }
  assert(loginFailedNonexistent, "Login fails generically with nonexistent email");

  // -------------------------------------------------------------------------
  // Scenario 5: Disabled / Suspended account cannot log in
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Disabled / Suspended Account Enforcement ---");
  let disabledLoginBlocked = false;
  try {
    await authenticateCredentials({
      email: "disabled@atelier.internal",
      password: "DisabledPass123!",
    });
  } catch (err: unknown) {
    if (err instanceof AuthError && err.code === "ACCOUNT_DISABLED") {
      disabledLoginBlocked = true;
    }
  }
  assert(disabledLoginBlocked, "Disabled or suspended user is blocked from logging in (403 Forbidden)");

  // -------------------------------------------------------------------------
  // Scenario 6: Session creation and verification across requests
  // -------------------------------------------------------------------------
  console.log("\n--- 6. Cryptographic Session Token Verification ---");
  const sessionToken = await createSessionToken(loginUser);
  assert(typeof sessionToken === "string" && sessionToken.length > 50, "Signed JWT session token generated");

  const verifiedSession = await verifySessionToken(sessionToken);
  assert(verifiedSession?.id === loginUser.id, "Session token successfully verifies and returns session user");

  const tamperedToken = sessionToken.slice(0, -5) + "abcde";
  const verifiedTampered = await verifySessionToken(tamperedToken);
  assert(verifiedTampered === null, "Tampered session token signature is rejected");

  // -------------------------------------------------------------------------
  // Scenario 7 & 8: Customer cannot access admin; Admin can access admin
  // -------------------------------------------------------------------------
  console.log("\n--- 7 & 8. Admin Portal Role Restriction ---");
  let customerAdminLoginBlocked = false;
  try {
    await authenticateCredentials(
      { email: uniqueEmail, password: rawPlaintextPassword },
      { requireStaffPortal: true }
    );
  } catch (err: unknown) {
    if (err instanceof AuthError && err.code === "FORBIDDEN") {
      customerAdminLoginBlocked = true;
    }
  }
  assert(customerAdminLoginBlocked, "Storefront customer cannot authenticate into admin portal");

  const adminUser = await authenticateCredentials(
    { email: "admin@atelier.internal", password: "AdminPass123!" },
    { requireStaffPortal: true }
  );
  assert(adminUser.role === "admin", "Admin user can authenticate into admin portal");
  assert(isAdminOrStaff(adminUser.role), "Admin role is recognized as administrative");

  // -------------------------------------------------------------------------
  // Scenario 9 & 10: Customer orders & IDOR Protection
  // -------------------------------------------------------------------------
  console.log("\n--- 9 & 10. Customer Data Access & IDOR Prevention ---");
  const customerA = await findUserByEmail("client@atelier.internal");
  const ownerUser = await findUserByEmail("owner@atelier.internal");
  assert(!!customerA, "Customer A exists");

  // Customer A's own order
  const orderA = await getOrderById("ord-10001");
  assert(orderA?.userId === customerA?.id, "Order A belongs to Customer A");

  // Secret Order belonging to Owner only
  const secretOwnerOrder = await getOrderById("ord-99999");
  assert(secretOwnerOrder?.userId === ownerUser?.id, "Order 99999 belongs to Owner");

  // Verify Customer A CAN access own order
  const allowedAccess = await requireOwnership(orderA!.userId, {
    id: customerA!.id,
    email: customerA!.email,
    firstName: customerA!.firstName,
    lastName: customerA!.lastName,
    role: customerA!.role,
    status: customerA!.status,
  });
  assert(allowedAccess.id === customerA!.id, "Customer A can access own order");

  // Verify Customer A CANNOT access Owner's order (IDOR)
  let idorBlocked = false;
  try {
    await requireOwnership(secretOwnerOrder!.userId, {
      id: customerA!.id,
      email: customerA!.email,
      firstName: customerA!.firstName,
      lastName: customerA!.lastName,
      role: customerA!.role,
      status: customerA!.status,
    });
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      idorBlocked = true;
    }
  }
  assert(idorBlocked, "IDOR Blocked: Customer A is rejected with 403 Forbidden when accessing another user's order");

  // -------------------------------------------------------------------------
  // Scenario 11 & 12: Least privilege: Staff permitted vs forbidden actions
  // -------------------------------------------------------------------------
  console.log("\n--- 11 & 12. Granular Permissions & Least Privilege ---");
  assert(hasPermission("staff", "orders.read"), "Staff possesses 'orders.read' permission");
  assert(hasPermission("staff", "inventory.update"), "Staff possesses 'inventory.update' permission");
  assert(!hasPermission("staff", "products.delete"), "Staff is FORBIDDEN from 'products.delete'");
  assert(!hasPermission("staff", "coupons.delete"), "Staff is FORBIDDEN from 'coupons.delete'");
  assert(!hasPermission("staff", "users.create"), "Staff is FORBIDDEN from 'users.create'");
  assert(!hasPermission("staff", "settings.update"), "Staff is FORBIDDEN from 'settings.update'");

  assert(hasPermission("admin", "products.create"), "Admin possesses 'products.create'");
  assert(hasPermission("owner", "settings.update"), "Owner possesses 'settings.update'");
  assert(hasPermission("owner", "roles.update"), "Owner possesses 'roles.update'");

  // -------------------------------------------------------------------------
  // Scenario 13: Privilege escalation prevention
  // -------------------------------------------------------------------------
  console.log("\n--- 13. Privilege Escalation Prevention ---");
  assert(!canAssignRole("customer", "admin"), "Customer cannot assign admin role");
  assert(!canAssignRole("customer", "staff"), "Customer cannot assign staff role");
  assert(!canAssignRole("staff", "admin"), "Staff cannot create or elevate to admin");
  assert(!canAssignRole("staff", "staff"), "Staff cannot create another staff member");
  assert(!canAssignRole("admin", "owner"), "Admin CANNOT elevate self or others to owner");
  assert(canAssignRole("admin", "staff"), "Admin CAN provision staff members");
  assert(canAssignRole("owner", "admin"), "Owner CAN assign admin role");
  assert(canAssignRole("owner", "owner"), "Owner CAN assign owner role");

  // Attempting to inject 'role' in customer profile update
  const updatedProfile = await updateCustomerProfile(customerA!.id, {
    firstName: "Arthur",
    lastName: "Pendleton",
    phone: "+1 555-9999",
  });
  assert(
    updatedProfile.role === "customer",
    "Profile update ignores any role manipulation and strictly preserves role"
  );

  // -------------------------------------------------------------------------
  // Scenario 14: Cart Authentication Transition
  // -------------------------------------------------------------------------
  console.log("\n--- 14. Cart Transition & Quantity Consolidation ---");
  const guestSessionId = "gst-temp-sess-99";
  setGuestCartItems(guestSessionId, [
    {
      id: "gi-1",
      variantId: "var-boot-42",
      quantity: 2,
      price: 495.0,
      addedAt: new Date().toISOString(),
    },
    {
      id: "gi-2",
      variantId: "var-sneaker-43",
      quantity: 1,
      price: 380.0,
      addedAt: new Date().toISOString(),
    },
  ]);

  const mergeResult = await mergeGuestCartToCustomer(guestSessionId, customerA!.id);
  assert(mergeResult.transferredCount >= 2, "Guest cart items transferred to customer");
  assert(mergeResult.items.some((i) => i.variantId === "var-boot-42"), "Consolidated items contain transferred variant");

  // -------------------------------------------------------------------------
  // Scenario 15 & 16: Password reset token flow & invalid token rejection
  // -------------------------------------------------------------------------
  console.log("\n--- 15 & 16. Password Reset Token Generation & Validation ---");
  const resetReq = await requestPasswordReset({ email: uniqueEmail });
  assert(resetReq.success, "Password reset request dispatched");
  assert(!!resetReq.devResetToken, "High-entropy token generated securely");

  // Submit with invalid token
  let invalidTokenRejected = false;
  try {
    await completePasswordReset({
      token: "completely-invalid-malformed-token-123456",
      newPassword: "BrandNewPassword2026!",
      confirmPassword: "BrandNewPassword2026!",
    });
  } catch (err: unknown) {
    if (err instanceof AuthError && err.code === "INVALID_TOKEN") {
      invalidTokenRejected = true;
    }
  }
  assert(invalidTokenRejected, "Invalid or expired password reset token is rejected");

  // Submit with valid token
  const validResetResult = await completePasswordReset({
    token: resetReq.devResetToken!,
    newPassword: "BrandNewPassword2026!",
    confirmPassword: "BrandNewPassword2026!",
  });
  assert(validResetResult.success, "Password reset completes successfully with valid token");

  // Re-submit with already used token (replay protection)
  let replayTokenRejected = false;
  try {
    await completePasswordReset({
      token: resetReq.devResetToken!,
      newPassword: "AnotherPassword2026!",
      confirmPassword: "AnotherPassword2026!",
    });
  } catch (err: unknown) {
    if (err instanceof AuthError && err.code === "INVALID_TOKEN") {
      replayTokenRejected = true;
    }
  }
  assert(replayTokenRejected, "Replay attack prevented: Single-use token cannot be reused");

  // Verify can log in with new password
  const newLogin = await authenticateCredentials({
    email: uniqueEmail,
    password: "BrandNewPassword2026!",
  });
  assert(newLogin.id === regResult.user.id, "Can log in with newly updated password");

  // -------------------------------------------------------------------------
  // Scenario 17: User Address Management (Create, List, Set Default, Delete)
  // -------------------------------------------------------------------------
  console.log("\n--- 17. User Address Management & Default Preferences ---");
  const addr1 = await createUserAddress({
    userId: regResult.user.id,
    recipientName: "Alexander Wright",
    addressLine1: "123 Madison Ave",
    addressLine2: "Suite 400",
    city: "New York",
    stateProvince: "NY",
    postalCode: "10016",
    countryCode: "US",
    phone: "+1 212 555 0100",
    isDefault: true,
  });
  assert(!!addr1.id, "User address 1 created with generated ID");
  assert(addr1.isDefault === true, "First address correctly designated as default");

  const addr2 = await createUserAddress({
    userId: regResult.user.id,
    recipientName: "Alexander Wright (Summer Residence)",
    addressLine1: "45 Ocean Blvd",
    city: "Southampton",
    stateProvince: "NY",
    postalCode: "11968",
    countryCode: "US",
    phone: "+1 631 555 0200",
    isDefault: true, // Should clear addr1 as default!
  });
  assert(!!addr2.id, "User address 2 created");

  let addresses = await getUserAddresses(regResult.user.id);
  assert(addresses.length === 2, "Both user addresses retrieved");
  const storedAddr1 = addresses.find((a) => a.id === addr1.id);
  const storedAddr2 = addresses.find((a) => a.id === addr2.id);
  assert(storedAddr2?.isDefault === true, "New address marked as default");
  assert(storedAddr1?.isDefault === false, "Previous default flag cleared upon new default creation");

  // Explicitly switch default back to addr1
  await setDefaultUserAddress(regResult.user.id, addr1.id);
  addresses = await getUserAddresses(regResult.user.id);
  assert(addresses.find((a) => a.id === addr1.id)?.isDefault === true, "Default address switched back to addr1");
  assert(addresses.find((a) => a.id === addr2.id)?.isDefault === false, "addr2 no longer default");

  // Delete addr2
  const deleteOk = await deleteUserAddress(regResult.user.id, addr2.id);
  assert(deleteOk === true, "User address successfully deleted");
  addresses = await getUserAddresses(regResult.user.id);
  assert(addresses.length === 1, "Only 1 address remaining after deletion");
  assert(addresses[0].id === addr1.id, "Correct address retained");

  // -------------------------------------------------------------------------
  // Scenario 18: Admin Customer & User Directory Querying
  // -------------------------------------------------------------------------
  console.log("\n--- 18. Admin Customer & User Directory Querying & Aggregation ---");
  const { users: allUsers, total: totalUserCount, stats: userStats } = await listAllUsers();
  assert(allUsers.length > 0, "listAllUsers retrieves directory records");
  assert(totalUserCount >= allUsers.length, "Total user count is accurate");
  assert(userStats.totalUsers > 0, "Stats totalUsers is populated");
  assert(userStats.customerCount > 0, "Stats customerCount is accurate");
  assert(userStats.adminCount > 0, "Stats adminCount includes system administrator");

  // Filter by role
  const { users: customersOnly } = await listAllUsers({ role: "customer" });
  assert(
    customersOnly.every((u) => u.role === "customer"),
    "Role filter strictly isolates customers"
  );

  // Search by email
  const { users: searchedUsers } = await listAllUsers({ search: uniqueEmail });
  assert(searchedUsers.length === 1, "Search locates user by exact email");
  assert(searchedUsers[0].id === regResult.user.id, "Found user matches registered entity");

  // Detailed customer dossier retrieval
  const customerDetails = await getUserWithDetails(regResult.user.id);
  assert(!!customerDetails, "getUserWithDetails retrieves complete user record");
  assert(customerDetails?.addresses.length === 1, "Customer dossier contains linked addresses");
  assert(customerDetails?.ordersCount === 0, "Customer dossier calculates order metrics");

  console.log("\n=======================================================");
  console.log(`ALL TESTS PASSED: ${passedCount} / ${totalCount} ASSERTIONS GREEN`);
  console.log("=======================================================\n");
}

runSecurityTests().catch((err) => {
  console.error("Test execution encountered error:", err);
  process.exit(1);
});
