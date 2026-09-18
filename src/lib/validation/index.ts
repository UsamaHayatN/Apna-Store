import { z } from "zod";

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address")
    .max(255),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(50, "First name cannot exceed 50 characters"),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(50, "Last name cannot exceed 50 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .email("Please enter a valid email address")
      .max(255),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(100, "Password cannot exceed 100 characters")
      .regex(
        passwordRegex,
        "Password must contain at least one letter and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    phone: z
      .string()
      .trim()
      .max(25, "Phone number cannot exceed 25 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "Invalid or malformed reset token"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(100)
      .regex(
        passwordRegex,
        "Password must contain at least one letter and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50),
  phone: z
    .string()
    .trim()
    .max(25)
    .optional()
    .or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(100)
      .regex(
        passwordRegex,
        "Password must contain at least one letter and one number"
      ),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  });

export const adminCreateStaffSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  role: z.enum(["staff", "admin"], {
    message: "Role must be 'staff' or 'admin'",
  }),
  temporaryPassword: z
    .string()
    .min(8, "Temporary password must be at least 8 characters long")
    .regex(passwordRegex, "Must contain at least one letter and one number"),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
});

export const adminUpdateUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["customer", "staff", "admin", "owner"]),
});

export const adminUpdateUserStatusSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  status: z.enum(["active", "suspended", "disabled", "pending"]),
});

export const addressSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  company: z.string().optional(),
  addressLine1: z.string().min(3, "Street address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  stateProvince: z.string().min(2, "State or province is required"),
  postalCode: z.string().min(3, "Postal code is required"),
  countryCode: z.string().length(2, "Country code must be 2 characters (e.g., US)"),
  phone: z.string().min(7, "Valid contact phone number is required"),
  isDefault: z.boolean().default(false),
});

export const productFilterSchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "featured"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const couponApplySchema = z.object({
  code: z.string().min(3, "Coupon code is required").trim().toUpperCase(),
  orderSubtotal: z.number().min(0),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AdminCreateStaffInput = z.infer<typeof adminCreateStaffSchema>;
export type AdminUpdateUserRoleInput = z.infer<typeof adminUpdateUserRoleSchema>;
export type AdminUpdateUserStatusInput = z.infer<typeof adminUpdateUserStatusSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
export type CouponApplyInput = z.infer<typeof couponApplySchema>;

export * from "./inventory";
export * from "./product";
export * from "./variant";
export * from "./category";
export * from "./collection";
