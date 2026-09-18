"use server";

import { revalidatePath } from "next/cache";
import { couponService, CouponRecord } from "@/lib/coupons/coupon-service";
import { requireAdminOrStaff } from "@/lib/auth/guards";

export async function getAdminCouponsAction(): Promise<CouponRecord[]> {
  await requireAdminOrStaff();
  return couponService.getAllCoupons();
}

export async function createAdminCouponAction(data: {
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minimumOrderAmount?: number;
  expiresInDays?: number;
}): Promise<{ success: boolean; coupon?: CouponRecord; error?: string }> {
  try {
    await requireAdminOrStaff();

    if (!data.code || data.code.trim().length < 3) {
      return { success: false, error: "Coupon code must be at least 3 characters." };
    }

    if (data.discountValue <= 0) {
      return { success: false, error: "Discount value must be greater than 0." };
    }

    if (data.discountType === "percentage" && data.discountValue > 100) {
      return { success: false, error: "Percentage discount cannot exceed 100%." };
    }

    const created = await couponService.createCoupon(data);
    revalidatePath("/admin/coupons");
    return { success: true, coupon: created };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create coupon.",
    };
  }
}

export async function toggleAdminCouponAction(
  couponId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminOrStaff();
    await couponService.toggleCouponActive(couponId, isActive);
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update coupon.",
    };
  }
}

export async function deleteAdminCouponAction(
  couponId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminOrStaff();
    await couponService.deleteCoupon(couponId);
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete coupon.",
    };
  }
}
