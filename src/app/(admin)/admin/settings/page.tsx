import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";
import { requireAdminOrStaff } from "@/lib/auth/guards";
import { listStaffAndAdminUsers } from "@/lib/auth/user-store";
import { StaffManagementCard } from "@/components/admin/StaffManagementCard";
import { AuditTrailCard } from "@/components/admin/AuditTrailCard";
import { getRecentAuditLogs } from "@/lib/auth/audit";
import { hasPermission } from "@/lib/auth/permissions";

export default async function AdminSettingsPage() {
  const currentUser = await requireAdminOrStaff();
  const staffUsers = await listStaffAndAdminUsers();
  const canReadAudit = hasPermission(currentUser.role, "audit.read");
  const auditLogs = canReadAudit ? getRecentAuditLogs(25) : [];

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="border-b border-neutral-200 pb-6">
        <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
          Store Configuration & Security
        </span>
        <h1 className="mt-1 text-2xl font-light uppercase tracking-tight text-neutral-950">
          Operational Parameters
        </h1>
      </div>

      {/* Staff & User Management Foundation */}
      <StaffManagementCard currentUser={currentUser} staffUsers={staffUsers} />

      {/* Security & Audit Trail */}
      {canReadAudit && <AuditTrailCard logs={auditLogs} />}

      {/* General Brand Settings */}
      <Card className="rounded-none border-neutral-200">
        <CardHeader>
          <CardTitle>General Brand Identity</CardTitle>
          <CardDescription>Primary store metadata and presentation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="settings-brand-name"
            label="Brand Name"
            defaultValue={siteConfig.brandName}
          />
          <Input
            id="settings-brand-tagline"
            label="Tagline"
            defaultValue={siteConfig.tagline}
          />
          <Button variant="primary" size="sm" className="text-xs uppercase tracking-wider">
            Save Brand Details
          </Button>
        </CardContent>
      </Card>

      {/* Shipping & Thresholds */}
      <Card className="rounded-none border-neutral-200">
        <CardHeader>
          <CardTitle>Shipping & Order Thresholds</CardTitle>
          <CardDescription>Transit pricing and complimentary shipping limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="settings-free-shipping"
              label="Free Shipping Minimum ($)"
              type="number"
              defaultValue={siteConfig.inventory.freeShippingThreshold}
            />
            <Input
              id="settings-shipping-fee"
              label="Standard Shipping Fee ($)"
              type="number"
              defaultValue={siteConfig.inventory.standardShippingFee}
            />
          </div>
          <Button variant="primary" size="sm" className="text-xs uppercase tracking-wider">
            Update Thresholds
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
