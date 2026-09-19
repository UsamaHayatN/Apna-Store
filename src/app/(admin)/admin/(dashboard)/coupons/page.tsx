import { requireAdminOrStaff } from "@/lib/auth/guards";
import { couponService } from "@/lib/coupons/coupon-service";
import { AdminCouponsClient } from "@/components/admin/AdminCouponsClient";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdminOrStaff();
  const coupons = await couponService.getAllCoupons();

  return <AdminCouponsClient initialCoupons={coupons} />;
}
