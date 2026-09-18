"use client";

import { useState } from "react";
import { AuthUser, UserRole, AccountStatus, SessionUser } from "@/types";
import {
  adminCreateStaffAction,
  adminUpdateRoleAction,
  adminUpdateStatusAction,
  ActionState,
} from "@/app/actions/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, UserPlus, AlertCircle, CheckCircle2, Lock } from "lucide-react";

interface StaffManagementProps {
  currentUser: SessionUser;
  staffUsers: AuthUser[];
}

export function StaffManagementCard({ currentUser, staffUsers }: StaffManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [state, setState] = useState<ActionState | null>(null);

  const isOwner = currentUser.role === "owner";
  const isAdmin = currentUser.role === "admin";
  const canManageUsers = isOwner || isAdmin;

  const handleCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    setState(null);
    const formData = new FormData(e.currentTarget);
    const res = await adminCreateStaffAction(null, formData);
    setState(res);
    setActionLoading(false);
    if (res.success) {
      setShowAddModal(false);
      window.location.reload();
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    setActionLoading(true);
    setState(null);
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("role", newRole);
    const res = await adminUpdateRoleAction(null, formData);
    setState(res);
    setActionLoading(false);
    if (res.success) {
      window.location.reload();
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: AccountStatus) => {
    setActionLoading(true);
    setState(null);
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("status", newStatus);
    const res = await adminUpdateStatusAction(null, formData);
    setState(res);
    setActionLoading(false);
    if (res.success) {
      window.location.reload();
    }
  };

  return (
    <Card className="rounded-none border-neutral-200">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-neutral-800" />
            Team & Role Authorization
          </CardTitle>
          <CardDescription>
            Manage administrative personnel, tier assignments, and operational permissions.
          </CardDescription>
        </div>

        {canManageUsers && (
          <Button
            id="add-staff-btn"
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(!showAddModal)}
            className="text-xs uppercase tracking-wider"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            {showAddModal ? "Cancel" : "Add Staff Member"}
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {state?.error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="p-3 bg-neutral-900 text-white text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {state.message}
          </div>
        )}

        {/* Add Staff Inline Modal */}
        {showAddModal && (
          <div className="p-5 bg-neutral-50 border border-neutral-200 space-y-4 animate-in fade-in">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              Provision New Administrative Account
            </h3>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input name="firstName" label="First Name" required />
                <Input name="lastName" label="Last Name" required />
              </div>
              <Input name="email" type="email" label="Work Email" required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-neutral-700 mb-1">
                    Role Tier
                  </label>
                  <select
                    name="role"
                    className="w-full h-10 border border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    defaultValue="staff"
                  >
                    <option value="staff">Staff (Catalog & Orders)</option>
                    {isOwner && <option value="admin">Admin (Manager)</option>}
                  </select>
                </div>
                <Input
                  name="temporaryPassword"
                  type="password"
                  label="Temporary Password"
                  placeholder="Min 8 chars, letter & number"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  id="submit-create-staff"
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Provisioning..." : "Provision Account"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Team Members List */}
        <div className="divide-y divide-neutral-200">
          {staffUsers.map((member) => {
            const isSelf = member.id === currentUser.id;
            const isTargetOwner = member.role === "owner";
            const canModifyThisUser =
              canManageUsers &&
              !isSelf &&
              (!isTargetOwner || isOwner);

            return (
              <div key={member.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-950">
                      {member.firstName} {member.lastName}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] uppercase font-mono text-neutral-400">
                        (You)
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {member.role}
                    </Badge>
                    <Badge
                      variant={member.status === "active" ? "neutral" : "danger"}
                      className="text-[10px] uppercase"
                    >
                      {member.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">{member.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {canModifyThisUser ? (
                    <>
                      {/* Role Selector */}
                      {isOwner && (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value as UserRole)}
                          className="h-8 border border-neutral-300 bg-white px-2 text-[11px] font-medium uppercase tracking-wider text-neutral-800 focus:outline-none"
                          disabled={actionLoading}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      )}

                      {/* Status Toggle */}
                      {member.status === "active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(member.id, "suspended")}
                          disabled={actionLoading}
                          className="text-[11px] text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(member.id, "active")}
                          disabled={actionLoading}
                          className="text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                        >
                          Activate
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {isSelf ? "Self Protected" : "Protected Role"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
