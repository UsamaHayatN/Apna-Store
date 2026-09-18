import { isDatabaseConfigured, getDb, schema } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import crypto from "node:crypto";

export interface CouponRecord {
  id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed" | "free_shipping";
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount?: number;
  usageLimitTotal?: number;
  usageLimitPerCustomer: number;
  timesUsed: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var _memoryCouponRegistry: Map<string, CouponRecord> | undefined;
}

const memoryCoupons: Map<string, CouponRecord> =
  global._memoryCouponRegistry || (global._memoryCouponRegistry = new Map());

// Seed default atelier coupons if empty
if (memoryCoupons.size === 0) {
  const defaults: CouponRecord[] = [
    {
      id: "cpn-gentleman15",
      code: "GENTLEMAN15",
      description: "15% off first order for registered gentlemen ($100 min)",
      discountType: "percentage",
      discountValue: 15,
      minimumOrderAmount: 100,
      usageLimitPerCustomer: 1,
      timesUsed: 3,
      isActive: true,
      startsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: "cpn-atelier50",
      code: "ATELIER50",
      description: "$50 private credit on footwear commissions over $250",
      discountType: "fixed",
      discountValue: 50,
      minimumOrderAmount: 250,
      usageLimitPerCustomer: 1,
      timesUsed: 1,
      isActive: true,
      startsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: "cpn-welcome10",
      code: "WELCOME10",
      description: "10% courtesy discount on introductory footwear inquiry",
      discountType: "percentage",
      discountValue: 10,
      minimumOrderAmount: 0,
      usageLimitPerCustomer: 1,
      timesUsed: 8,
      isActive: true,
      startsAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: "cpn-concierge",
      code: "VIPCONCIERGE",
      description: "Complimentary white-glove upgrade and 20% privilege deduction",
      discountType: "percentage",
      discountValue: 20,
      minimumOrderAmount: 400,
      usageLimitPerCustomer: 1,
      timesUsed: 0,
      isActive: true,
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  for (const d of defaults) {
    memoryCoupons.set(d.id, d);
  }
}

export class CouponService {
  async getAllCoupons(): Promise<CouponRecord[]> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(schema.coupons)
          .orderBy(desc(schema.coupons.createdAt));

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            code: r.code,
            description: r.description || "",
            discountType: (r.discountType === "fixed_amount" ? "fixed" : r.discountType) as any,
            discountValue: parseFloat(r.discountValue),
            minimumOrderAmount: parseFloat(r.minimumOrderAmount || "0"),
            maxDiscountAmount: r.maxDiscountAmount ? parseFloat(r.maxDiscountAmount) : undefined,
            usageLimitTotal: r.usageLimitTotal || undefined,
            usageLimitPerCustomer: r.usageLimitPerCustomer,
            timesUsed: r.timesUsed,
            isActive: r.isActive,
            startsAt: r.startsAt.toISOString(),
            expiresAt: r.expiresAt.toISOString(),
            createdAt: r.createdAt.toISOString(),
          }));
        }
      } catch (err) {
        console.warn("DB getAllCoupons fallback to memory:", err);
      }
    }

    return Array.from(memoryCoupons.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async validateCoupon(code: string, subtotal: number): Promise<{
    success: boolean;
    code?: string;
    discountType?: "percentage" | "fixed" | "free_shipping";
    discountValue?: number;
    discountAmount?: number;
    error?: string;
  }> {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      return { success: false, error: "Please enter a coupon or voucher code." };
    }

    const all = await this.getAllCoupons();
    const found = all.find((c) => c.code.toUpperCase() === clean);

    if (!found) {
      return { success: false, error: "The provided code is invalid or unrecognized." };
    }

    if (!found.isActive) {
      return { success: false, error: "This promotional voucher is currently inactive." };
    }

    const now = new Date();
    if (new Date(found.expiresAt).getTime() < now.getTime()) {
      return { success: false, error: "This promotional voucher has expired." };
    }

    if (found.minimumOrderAmount > 0 && subtotal < found.minimumOrderAmount) {
      return {
        success: false,
        error: `Code ${found.code} requires a minimum order subtotal of $${found.minimumOrderAmount.toFixed(2)}.`,
      };
    }

    let discountAmount = 0;
    if (found.discountType === "percentage") {
      discountAmount = Math.round(((subtotal * found.discountValue) / 100) * 100) / 100;
      if (found.maxDiscountAmount && discountAmount > found.maxDiscountAmount) {
        discountAmount = found.maxDiscountAmount;
      }
    } else if (found.discountType === "fixed") {
      discountAmount = Math.min(found.discountValue, subtotal);
    }

    return {
      success: true,
      code: found.code,
      discountType: found.discountType,
      discountValue: found.discountValue,
      discountAmount,
    };
  }

  async createCoupon(data: {
    code: string;
    description?: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minimumOrderAmount?: number;
    expiresInDays?: number;
  }): Promise<CouponRecord> {
    const cleanCode = data.code.trim().toUpperCase();
    const id = `cpn-${crypto.randomUUID()}`;
    const now = new Date();
    const days = data.expiresInDays || 90;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const record: CouponRecord = {
      id,
      code: cleanCode,
      description: data.description || `Special promotion: ${data.discountValue}${data.discountType === "percentage" ? "%" : " USD"} off`,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minimumOrderAmount: data.minimumOrderAmount || 0,
      usageLimitPerCustomer: 1,
      timesUsed: 0,
      isActive: true,
      startsAt: now.toISOString(),
      expiresAt,
      createdAt: now.toISOString(),
    };

    memoryCoupons.set(id, record);

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db.insert(schema.coupons).values({
          id,
          code: cleanCode,
          description: record.description,
          discountType: data.discountType === "fixed" ? "fixed_amount" : "percentage",
          discountValue: data.discountValue.toFixed(2),
          minimumOrderAmount: (data.minimumOrderAmount || 0).toFixed(2),
          usageLimitPerCustomer: 1,
          timesUsed: 0,
          startsAt: now,
          expiresAt: new Date(expiresAt),
          isActive: true,
        });
      } catch (err) {
        console.warn("DB insert coupon error (saved to memory):", err);
      }
    }

    return record;
  }

  async toggleCouponActive(couponId: string, isActive: boolean): Promise<boolean> {
    const mem = memoryCoupons.get(couponId);
    if (mem) {
      mem.isActive = isActive;
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(schema.coupons)
          .set({ isActive, updatedAt: new Date() })
          .where(eq(schema.coupons.id, couponId));
      } catch (err) {
        console.warn("DB toggleCouponActive error:", err);
      }
    }

    return true;
  }

  async deleteCoupon(couponId: string): Promise<boolean> {
    memoryCoupons.delete(couponId);

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId));
      } catch (err) {
        console.warn("DB deleteCoupon error:", err);
      }
    }

    return true;
  }
}

export const couponService = new CouponService();
