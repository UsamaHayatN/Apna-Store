"use client";

import { useState, useMemo } from "react";
import { AuthUser, SessionUser, UserRole, AccountStatus } from "@/types";
import {
  adminCreateStaffAction,
  adminUpdateRoleAction,
  adminUpdateStatusAction,
  ActionState,
} from "@/app/actions/auth";
import { hasPermission, canAssignRole, canModifyUserWithRole, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  Shield,
  UserCheck,
  UserX,
  Search,
  Plus,
  Key,
  Lock,
  Clock,
  ShieldAlert,
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";

interface AdminStaffClientProps {
  currentUser: SessionUser;
  initialStaff: AuthUser[];
}

export function AdminStaffClient({ currentUser, initialStaff }: AdminStaffClientProps) {
  const [staffList, setStaffList] = useState<AuthUser[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermissionsMatrixOpen, setIsPermissionsMatrixOpen] = useState(false);
  const [selectedStaffForRole, setSelectedStaffForRole] = useState<AuthUser | null>(null);
  const [newRoleValue, setNewRoleValue] = useState<UserRole>("staff");

  // Status & Feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<ActionState | null>(null);

  // Form states for adding staff
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<"staff" | "admin">("staff");
  const [formTempPassword, setFormTempPassword] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const filteredStaff = useMemo(() => {
    return staffList.filter((u) => {
      const matchesSearch =
        searchQuery === "" ||
        `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [staffList, searchQuery, statusFilter, roleFilter]);

  const canCreateStaff = hasPermission(currentUser.role, "users.create");
  const canUpdateRoles = hasPermission(currentUser.role, "roles.update");
  const canUpdateStatus = hasPermission(currentUser.role, "users.update");

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.set("firstName", formFirstName);
    formData.set("lastName", formLastName);
    formData.set("email", formEmail);
    formData.set("role", formRole);
    formData.set("temporaryPassword", formTempPassword);
    formData.set("phone", formPhone);

    const res = await adminCreateStaffAction(null, formData);
    setFeedback(res);
    setActionLoading(false);

    if (res.success) {
      // Add to local state
      const newStaff: AuthUser = {
        id: `usr-${Date.now()}`,
        email: formEmail,
        passwordHash: "",
        firstName: formFirstName,
        lastName: formLastName,
        role: formRole,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerifiedAt: new Date().toISOString(),
      };
      setStaffList((prev) => [newStaff, ...prev]);
      setIsAddStaffOpen(false);
      setFormFirstName("");
      setFormLastName("");
      setFormEmail("");
      setFormTempPassword("");
      setFormPhone("");
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForRole) return;
    setActionLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.set("userId", selectedStaffForRole.id);
    formData.set("role", newRoleValue);

    const res = await adminUpdateRoleAction(null, formData);
    setFeedback(res);
    setActionLoading(false);

    if (res.success) {
      setStaffList((prev) =>
        prev.map((u) => (u.id === selectedStaffForRole.id ? { ...u, role: newRoleValue } : u))
      );
      setIsRoleModalOpen(false);
      setSelectedStaffForRole(null);
    }
  };

  const handleToggleStatus = async (user: AuthUser, nextStatus: AccountStatus) => {
    if (user.id === currentUser.id) {
      setFeedback({ success: false, error: "Security restriction: You cannot modify your own account status." });
      return;
    }
    if (user.role === "owner" && currentUser.role !== "owner") {
      setFeedback({ success: false, error: "Only an Owner may modify the status of another Owner." });
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.set("userId", user.id);
    formData.set("status", nextStatus);

    const res = await adminUpdateStatusAction(null, formData);
    setFeedback(res);
    setActionLoading(false);

    if (res.success) {
      setStaffList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Access Control & RBAC
          </span>
          <h1 className="mt-1 text-2xl font-light uppercase tracking-tight text-neutral-950">
            Staff & Administrative Privileges
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPermissionsMatrixOpen(true)}
            className="text-xs uppercase tracking-wider"
          >
            <Shield className="mr-1.5 h-3.5 w-3.5 text-neutral-500" />
            <span>Permissions Matrix</span>
          </Button>
          {canCreateStaff && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddStaffOpen(true)}
              className="text-xs uppercase tracking-wider"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span>Add Staff Member</span>
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs border flex items-center justify-between ${
            feedback.success
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span>{feedback.message || feedback.error}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Active Staff & Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-neutral-900 font-mono">
              {staffList.filter((s) => s.status === "active").length}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">Authorized console operators</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Executive Owners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-neutral-900 font-mono">
              {staffList.filter((s) => s.role === "owner").length}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">Demotion protection enforced</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Suspended Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-amber-600 font-mono">
              {staffList.filter((s) => s.status !== "active").length}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">Access temporarily revoked</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <Input
            placeholder="Search staff by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { label: "All Roles", value: "all" },
              { label: "Owner", value: "owner" },
              { label: "Admin", value: "admin" },
              { label: "Staff", value: "staff" },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { label: "All Statuses", value: "all" },
              { label: "Active", value: "active" },
              { label: "Suspended", value: "suspended" },
              { label: "Disabled", value: "disabled" },
            ]}
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-neutral-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-neutral-400 text-xs">
                  No staff members found matching the specified filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => {
                const isSelf = staff.id === currentUser.id;
                const isTargetOwner = staff.role === "owner";
                const canModifyTarget = canModifyUserWithRole(currentUser.role, staff.role);

                return (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-900 text-xs">
                            {staff.firstName || staff.lastName
                              ? `${staff.firstName || ""} ${staff.lastName || ""}`.trim()
                              : "Staff Member"}
                          </span>
                          {isSelf && (
                            <Badge variant="outline" className="text-[9px] uppercase">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-neutral-400 mt-0.5">{staff.email}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          staff.role === "owner"
                            ? "neutral"
                            : staff.role === "admin"
                            ? "outline"
                            : "outline"
                        }
                        className="text-[10px] uppercase font-semibold"
                      >
                        {staff.role}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          staff.status === "active"
                            ? "success"
                            : staff.status === "suspended"
                            ? "warning"
                            : "danger"
                        }
                        className="text-[10px] uppercase tracking-wider"
                      >
                        {staff.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs font-mono text-neutral-500">
                      {staff.lastLoginAt ? (
                        new Date(staff.lastLoginAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      ) : (
                        <span className="text-neutral-400">Never</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-neutral-500">
                      {new Date(staff.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdateRoles && canModifyTarget && !isSelf && !isTargetOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStaffForRole(staff);
                              setNewRoleValue(staff.role);
                              setIsRoleModalOpen(true);
                            }}
                            className="text-xs"
                          >
                            Change Role
                          </Button>
                        )}

                        {canUpdateStatus && canModifyTarget && !isSelf && (
                          <>
                            {staff.status === "active" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleStatus(staff, "suspended")}
                                className="text-xs text-amber-700 hover:bg-amber-50"
                              >
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleStatus(staff, "active")}
                                className="text-xs text-emerald-700 hover:bg-emerald-50"
                              >
                                Reactivate
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ADD STAFF MODAL */}
      <Modal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Invite New Staff Member"
        description="Provision a secure console account for store operations"
        maxWidth="md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                First Name
              </label>
              <Input
                required
                value={formFirstName}
                onChange={(e) => setFormFirstName(e.target.value)}
                placeholder="e.g. Julian"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Last Name
              </label>
              <Input
                required
                value={formLastName}
                onChange={(e) => setFormLastName(e.target.value)}
                placeholder="e.g. Vance"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Email Address
            </label>
            <Input
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="e.g. staff@yourbrand.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Role Assignment
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as "staff" | "admin")}
                className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
              >
                <option value="staff">Staff (Operational)</option>
                {currentUser.role === "owner" && (
                  <option value="admin">Administrator (Full Access)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Temporary Password
              </label>
              <Input
                type="password"
                required
                value={formTempPassword}
                onChange={(e) => setFormTempPassword(e.target.value)}
                placeholder="Min 8 chars, 1 number"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Contact Phone (Optional)
            </label>
            <Input
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="+1 (555) 019-2834"
            />
          </div>

          <div className="pt-4 border-t border-neutral-200 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddStaffOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={actionLoading}
            >
              {actionLoading ? "Creating..." : "Provision Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CHANGE ROLE MODAL */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedStaffForRole(null);
        }}
        title="Update Staff Role"
        description={
          selectedStaffForRole
            ? `Modify administrative authority for ${selectedStaffForRole.email}`
            : undefined
        }
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
              Select New Role
            </label>
            <select
              value={newRoleValue}
              onChange={(e) => setNewRoleValue(e.target.value as UserRole)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
            >
              <option value="staff">Staff (Catalog & Fulfillment Operations)</option>
              {currentUser.role === "owner" && (
                <option value="admin">Administrator (Settings & User Management)</option>
              )}
            </select>
          </div>

          <div className="pt-4 border-t border-neutral-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRoleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={actionLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* PERMISSIONS MATRIX MODAL */}
      <Modal
        isOpen={isPermissionsMatrixOpen}
        onClose={() => setIsPermissionsMatrixOpen(false)}
        title="Role-Based Access Control (RBAC) Matrix"
        description="Comprehensive breakdown of granular permissions across all operational roles"
        maxWidth="lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* OWNER */}
            <div className="p-4 border border-neutral-900 bg-neutral-950 text-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold uppercase tracking-wider text-white">Owner</span>
                <Badge variant="neutral" className="bg-neutral-800 text-white border-neutral-700 text-[9px]">
                  Unrestricted
                </Badge>
              </div>
              <p className="text-neutral-400 text-[11px] mb-3">
                Full authority including financial payout settings, irreversible data purges, and owner role assignment.
              </p>
              <div className="text-[11px] space-y-1 text-neutral-300 font-mono">
                <div>✓ All catalog, order & refund ops</div>
                <div>✓ Full RBAC & staff lifecycle</div>
                <div>✓ Store & payment configuration</div>
                <div>✓ Security audit log review</div>
              </div>
            </div>

            {/* ADMIN */}
            <div className="p-4 border border-neutral-200 bg-neutral-50 text-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold uppercase tracking-wider text-neutral-950">Admin</span>
                <Badge variant="outline" className="text-[9px]">
                  Full Operations
                </Badge>
              </div>
              <p className="text-neutral-500 text-[11px] mb-3">
                Broad administrative rights to manage products, categories, coupons, inventory, and staff accounts.
              </p>
              <div className="text-[11px] space-y-1 text-neutral-600 font-mono">
                <div>✓ Product & inventory ledger</div>
                <div>✓ Order fulfillment & refunds</div>
                <div>✓ Customer & coupon control</div>
                <div>✗ Cannot demote or edit Owner</div>
              </div>
            </div>

            {/* STAFF */}
            <div className="p-4 border border-neutral-200 bg-white text-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold uppercase tracking-wider text-neutral-950">Staff</span>
                <Badge variant="outline" className="text-[9px]">
                  Operations
                </Badge>
              </div>
              <p className="text-neutral-500 text-[11px] mb-3">
                Day-to-day warehouse and fulfillment operations, product updates, and customer support.
              </p>
              <div className="text-[11px] space-y-1 text-neutral-600 font-mono">
                <div>✓ Product read & update</div>
                <div>✓ Inventory tracking & counts</div>
                <div>✓ Order view & shipment tracking</div>
                <div>✗ No role/staff management</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-200 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPermissionsMatrixOpen(false)}
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
