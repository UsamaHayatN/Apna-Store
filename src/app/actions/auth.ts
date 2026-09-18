"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  authenticateCredentials,
  registerCustomer,
  requestPasswordReset,
  completePasswordReset,
  updateCustomerProfile,
  changeCustomerPassword,
  adminCreateStaffUser,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  AuthError,
} from "@/lib/auth/service";
import { setSessionCookie, clearSessionCookie, getSessionUser } from "@/lib/auth/session";
import { requireUser, requireAdminOrStaff, requirePermission } from "@/lib/auth/guards";
import { createUserAddress, updateUserAddress, deleteUserAddress, setDefaultUserAddress } from "@/lib/auth/user-store";
import { UserRole, AccountStatus } from "@/types";

export interface ActionState {
  success: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, unknown>;
}

/**
 * Storefront Customer Login Action.
 */
export async function loginAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get("email") as string) || "";
  const password = (formData.get("password") as string) || "";
  const redirectTo = (formData.get("redirectTo") as string) || "/account";

  try {
    const user = await authenticateCredentials({ email, password });
    await setSessionCookie(user);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Authentication failed. Please try again." };
  }

  revalidatePath("/account");
  redirect(redirectTo);
}

/**
 * Storefront Customer Registration Action.
 */
export async function registerAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const firstName = (formData.get("firstName") as string) || "";
  const lastName = (formData.get("lastName") as string) || "";
  const email = (formData.get("email") as string) || "";
  const password = (formData.get("password") as string) || "";
  const confirmPassword = (formData.get("confirmPassword") as string) || "";
  const phone = (formData.get("phone") as string) || "";
  const redirectTo = (formData.get("redirectTo") as string) || "/account";

  try {
    const result = await registerCustomer({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phone: phone || undefined,
    });

    await setSessionCookie(result.user);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Registration failed. Please check your inputs." };
  }

  revalidatePath("/account");
  redirect(redirectTo);
}

/**
 * Logout Action (Customer & Admin).
 */
export async function logoutAction(redirectTo: string = "/account"): Promise<void> {
  await clearSessionCookie();
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/admin");
  redirect(redirectTo);
}

/**
 * Forgot Password Action.
 */
export async function forgotPasswordAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get("email") as string) || "";

  try {
    const result = await requestPasswordReset({ email });
    return {
      success: true,
      message: result.message,
      data: result.devResetToken ? { devToken: result.devResetToken } : undefined,
    };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to process password reset request." };
  }
}

/**
 * Reset Password with Token Action.
 */
export async function resetPasswordAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const token = (formData.get("token") as string) || "";
  const newPassword = (formData.get("newPassword") as string) || "";
  const confirmPassword = (formData.get("confirmPassword") as string) || "";

  try {
    const result = await completePasswordReset({
      token,
      newPassword,
      confirmPassword,
    });
    return { success: true, message: result.message };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to reset password." };
  }
}

/**
 * Update Profile Action.
 */
export async function updateProfileAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const currentUser = await requireUser();

    const firstName = (formData.get("firstName") as string) || "";
    const lastName = (formData.get("lastName") as string) || "";
    const phone = (formData.get("phone") as string) || "";

    const updated = await updateCustomerProfile(currentUser.id, {
      firstName,
      lastName,
      phone,
    });

    // Update session cookie with new name
    await setSessionCookie(updated);
    revalidatePath("/account");
    return { success: true, message: "Profile updated successfully." };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to update profile." };
  }
}

/**
 * Change Password Action.
 */
export async function changePasswordAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const currentUser = await requireUser();

    const currentPassword = (formData.get("currentPassword") as string) || "";
    const newPassword = (formData.get("newPassword") as string) || "";
    const confirmNewPassword = (formData.get("confirmNewPassword") as string) || "";

    await changeCustomerPassword(currentUser.id, {
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    return { success: true, message: "Password updated successfully." };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to change password." };
  }
}

/**
 * Admin Portal Login Action.
 */
export async function adminLoginAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get("email") as string) || "";
  const password = (formData.get("password") as string) || "";

  try {
    const user = await authenticateCredentials(
      { email, password },
      { requireStaffPortal: true }
    );
    await setSessionCookie(user);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Administrative authentication failed." };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

/**
 * Admin Create Staff Member Action.
 */
export async function adminCreateStaffAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const actingUser = await requireAdminOrStaff();

    const firstName = (formData.get("firstName") as string) || "";
    const lastName = (formData.get("lastName") as string) || "";
    const email = (formData.get("email") as string) || "";
    const role = (formData.get("role") as UserRole) || "staff";
    const temporaryPassword = (formData.get("temporaryPassword") as string) || "";
    const phone = (formData.get("phone") as string) || "";

    await adminCreateStaffUser(actingUser, {
      firstName,
      lastName,
      email,
      role: role as "staff" | "admin",
      temporaryPassword,
      phone,
    });

    revalidatePath("/admin/settings");
    return { success: true, message: `Staff member ${email} created successfully.` };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to create staff member." };
  }
}

/**
 * Admin Update User Role Action.
 */
export async function adminUpdateRoleAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const actingUser = await requireAdminOrStaff();
    const userId = (formData.get("userId") as string) || "";
    const newRole = (formData.get("role") as UserRole) || "customer";

    await adminUpdateUserRole(actingUser, userId, newRole);
    revalidatePath("/admin/settings");
    revalidatePath("/admin/customers");
    return { success: true, message: "User role updated successfully." };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to update role." };
  }
}

/**
 * Admin Update User Status Action (Activate/Suspend/Disable).
 */
export async function adminUpdateStatusAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const actingUser = await requireAdminOrStaff();
    const userId = (formData.get("userId") as string) || "";
    const status = (formData.get("status") as AccountStatus) || "active";

    await adminUpdateUserStatus(actingUser, userId, status);
    revalidatePath("/admin/settings");
    revalidatePath("/admin/customers");
    return { success: true, message: `User status changed to ${status}.` };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to update user status." };
  }
}

/**
 * Customer Address Creation Action.
 */
export async function createAddressAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const recipientName = (formData.get("recipientName") as string) || "";
    const company = (formData.get("company") as string) || "";
    const addressLine1 = (formData.get("addressLine1") as string) || "";
    const addressLine2 = (formData.get("addressLine2") as string) || "";
    const city = (formData.get("city") as string) || "";
    const stateProvince = (formData.get("stateProvince") as string) || "";
    const postalCode = (formData.get("postalCode") as string) || "";
    const countryCode = (formData.get("countryCode") as string) || "US";
    const phone = (formData.get("phone") as string) || "";
    const isDefault = formData.get("isDefault") === "on" || formData.get("isDefault") === "true";

    if (!recipientName.trim()) {
      return { success: false, error: "Recipient name is required." };
    }
    if (!addressLine1.trim()) {
      return { success: false, error: "Street address is required." };
    }
    if (!city.trim()) {
      return { success: false, error: "City is required." };
    }
    if (!postalCode.trim()) {
      return { success: false, error: "Postal code is required." };
    }

    await createUserAddress(user.id, {
      recipientName: recipientName.trim(),
      company: company.trim() || undefined,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim(),
      stateProvince: stateProvince.trim(),
      postalCode: postalCode.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      phone: phone.trim(),
      isDefault,
    });

    revalidatePath("/account");
    revalidatePath("/account/addresses");
    return { success: true, message: "Delivery address added successfully." };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to add delivery address." };
  }
}

/**
 * Customer Address Update Action.
 */
export async function updateAddressAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const addressId = (formData.get("addressId") as string) || "";
    const recipientName = (formData.get("recipientName") as string) || "";
    const company = (formData.get("company") as string) || "";
    const addressLine1 = (formData.get("addressLine1") as string) || "";
    const addressLine2 = (formData.get("addressLine2") as string) || "";
    const city = (formData.get("city") as string) || "";
    const stateProvince = (formData.get("stateProvince") as string) || "";
    const postalCode = (formData.get("postalCode") as string) || "";
    const countryCode = (formData.get("countryCode") as string) || "US";
    const phone = (formData.get("phone") as string) || "";
    const isDefault = formData.get("isDefault") === "on" || formData.get("isDefault") === "true";

    if (!addressId) {
      return { success: false, error: "Address identifier is required." };
    }
    if (!recipientName.trim()) {
      return { success: false, error: "Recipient name is required." };
    }
    if (!addressLine1.trim()) {
      return { success: false, error: "Street address is required." };
    }
    if (!city.trim()) {
      return { success: false, error: "City is required." };
    }
    if (!postalCode.trim()) {
      return { success: false, error: "Postal code is required." };
    }

    const updated = await updateUserAddress(user.id, addressId, {
      recipientName: recipientName.trim(),
      company: company.trim() || undefined,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim(),
      stateProvince: stateProvince.trim(),
      postalCode: postalCode.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      phone: phone.trim(),
      isDefault,
      isDefaultShipping: isDefault,
    });

    if (!updated) {
      return { success: false, error: "Address not found or unauthorized." };
    }

    revalidatePath("/account");
    revalidatePath("/account/addresses");
    return { success: true, message: "Delivery destination updated successfully." };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to update delivery address." };
  }
}

/**
 * Customer Address Deletion Action.
 */
export async function deleteAddressAction(
  addressId: string
): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!addressId) {
      return { success: false, error: "Address identifier is required." };
    }

    const removed = await deleteUserAddress(user.id, addressId);
    if (!removed) {
      return { success: false, error: "Address could not be found or was already removed." };
    }

    revalidatePath("/account");
    revalidatePath("/account/addresses");
    return { success: true, message: "Address removed successfully." };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to remove address." };
  }
}

/**
 * Customer Set Default Address Action.
 */
export async function setDefaultAddressAction(
  addressId: string
): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!addressId) {
      return { success: false, error: "Address identifier is required." };
    }

    const updated = await setDefaultUserAddress(user.id, addressId);
    if (!updated) {
      return { success: false, error: "Address not found." };
    }

    revalidatePath("/account");
    revalidatePath("/account/addresses");
    return { success: true, message: "Default delivery address updated." };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to set default address." };
  }
}

/**
 * Admin Create Customer Action.
 */
export async function adminCreateCustomerAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    await requirePermission("users.create", "/admin/login");

    const firstName = (formData.get("firstName") as string) || "";
    const lastName = (formData.get("lastName") as string) || "";
    const email = (formData.get("email") as string) || "";
    const password = (formData.get("password") as string) || "Customer2026!";
    const phone = (formData.get("phone") as string) || "";

    if (!email || !firstName || !lastName) {
      return { success: false, error: "First name, last name, and email are required." };
    }

    await registerCustomer({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword: password,
      phone: phone.trim() || undefined,
    });

    revalidatePath("/admin/customers");
    return { success: true, message: `Customer account ${email} created successfully.` };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to create customer account." };
  }
}
