"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AuthUser, SessionUser, UserRole, AccountStatus } from "@/types";
import { UserStatsSummary } from "@/lib/auth/user-store";
import {
  adminCreateCustomerAction,
  adminUpdateRoleAction,
  adminUpdateStatusAction,
  ActionState,
} from "@/app/actions/auth";
import { hasPermission, canAssignRole, canModifyUserWithRole } from "@/lib/auth/permissions";
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
  Users,
  UserCheck,
  Shield,
  UserX,
  Search,
  Plus,
  Filter,
  Eye,
  MoreHorizontal,
  Clock,
  MapPin,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

interface AdminCustomersClientProps {
  currentUser: SessionUser;
  initialUsers: AuthUser[];
  initialStats: UserStatsSummary;
}

interface UserDetailView extends AuthUser {
  orders?: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    orderStatus: string;
    paymentStatus: string;
    totalAmount: number;
    currency: string;
    itemsCount: number;
  }>;
  addresses?: Array<{
    id: string;
    recipientName: string;
    company?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    stateProvince: string;
    postalCode: string;
    countryCode: string;
    phone: string;
    isDefault: boolean;
  }>;
  ordersCount?: number;
  totalSpend?: number;
}

export function AdminCustomersClient({
  currentUser,
  initialUsers,
  initialStats,
}: AdminCustomersClientProps) {
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Action states & modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<AuthUser | null>(null);
  const [newRoleValue, setNewRoleValue] = useState<UserRole>("customer");

  // User inspection drawer
  const [inspectingUser, setInspectingUser] = useState<UserDetailView | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // General action status message
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionState | null>(null);

  // Check permissions of the currently signed-in operator
  const canCreateUser = hasPermission(currentUser.role, "users.create");
  const canUpdateRole = hasPermission(currentUser.role, "roles.update");
  const canUpdateUser = hasPermission(currentUser.role, "users.update");

  // Filter users based on query and selections
  const filteredUsers = useMemo(() => {
    return initialUsers.filter((user) => {
      // Role match
      if (selectedRole !== "all" && user.role !== selectedRole) {
        return false;
      }
      // Status match
      if (selectedStatus !== "all" && user.status !== selectedStatus) {
        return false;
      }
      // Search match (name, email, phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const phone = (user.phone || "").toLowerCase();
        if (!fullName.includes(q) && !email.includes(q) && !phone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [initialUsers, selectedRole, selectedStatus, searchQuery]);

  // Load complete customer inspection details (orders, addresses, spend)
  const handleInspectUser = async (user: AuthUser) => {
    setLoadingDetails(true);
    setInspectingUser(user);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      const data = await res.json();
      if (data.success && data.user) {
        setInspectingUser(data.user);
      }
    } catch {
      // Fallback to existing user object
    } finally {
      setLoadingDetails(false);
    }
  };

  // Toggle user status (Active <-> Suspended)
  const handleToggleStatus = async (user: AuthUser) => {
    if (!canModifyUserWithRole(currentUser.role, user.role)) {
      setActionFeedback({
        success: false,
        error: "Privilege Restriction: You cannot alter accounts of equal or higher rank.",
      });
      return;
    }

    if (user.id === currentUser.id) {
      setActionFeedback({
        success: false,
        error: "Self-Modification Blocked: You cannot suspend your own administrative session.",
      });
      return;
    }

    const nextStatus: AccountStatus =
      user.status === "active" ? "suspended" : "active";

    const promptText =
      nextStatus === "suspended"
        ? `Are you sure you want to suspend account ${user.email}? They will be immediately blocked from signing in.`
        : `Re-activate account ${user.email}?`;

    let confirmed = true;
    try {
      confirmed = window.confirm(promptText);
    } catch {
      confirmed = true;
    }
    if (!confirmed) return;

    setActionLoading(true);
    setActionFeedback(null);
    const formData = new FormData();
    formData.append("userId", user.id);
    formData.append("status", nextStatus);

    const res = await adminUpdateStatusAction(null, formData);
    setActionFeedback(res);
    setActionLoading(false);
    if (inspectingUser && inspectingUser.id === user.id) {
      setInspectingUser({ ...inspectingUser, status: nextStatus });
    }
  };

  // Save new role assignment
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole) return;

    setActionLoading(true);
    setActionFeedback(null);
    const formData = new FormData();
    formData.append("userId", selectedUserForRole.id);
    formData.append("role", newRoleValue);

    const res = await adminUpdateRoleAction(null, formData);
    setActionFeedback(res);
    setActionLoading(false);

    if (res.success) {
      setIsRoleModalOpen(false);
      setSelectedUserForRole(null);
      if (inspectingUser && inspectingUser.id === selectedUserForRole.id) {
        setInspectingUser({ ...inspectingUser, role: newRoleValue });
      }
    }
  };

  // Create new customer action
  const handleCreateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    setActionFeedback(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await adminCreateCustomerAction(null, formData);
    setActionFeedback(res);
    setActionLoading(false);

    if (res.success) {
      form.reset();
      setIsAddCustomerOpen(false);
    }
  };

  // Helper for role badge styling
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "owner":
        return <Badge variant="neutral" className="bg-neutral-950 text-white font-mono uppercase text-[10px]">Owner</Badge>;
      case "admin":
        return <Badge variant="neutral" className="bg-neutral-800 text-white font-mono uppercase text-[10px]">Admin</Badge>;
      case "staff":
        return <Badge variant="outline" className="text-neutral-900 border-neutral-400 font-mono uppercase text-[10px]">Staff</Badge>;
      default:
        return <Badge variant="outline" className="text-neutral-500 font-mono uppercase text-[10px]">Client</Badge>;
    }
  };

  // Helper for status badge styling
  const getStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="success" className="uppercase text-[10px]">Active</Badge>;
      case "suspended":
        return <Badge variant="warning" className="uppercase text-[10px]">Suspended</Badge>;
      case "disabled":
        return <Badge variant="danger" className="uppercase text-[10px]">Disabled</Badge>;
      default:
        return <Badge variant="neutral" className="uppercase text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Access Control & Clients
          </span>
          <h1 className="mt-1 text-2xl font-light uppercase tracking-tight text-neutral-950">
            User & Customer Directory
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Manage authenticated storefront clients, staff credentials, and privilege tiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreateUser && (
            <Button
              id="admin-create-customer-btn"
              onClick={() => {
                setIsAddCustomerOpen(true);
                setActionFeedback(null);
              }}
              variant="primary"
              size="sm"
              className="text-xs uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Register Client
            </Button>
          )}
        </div>
      </div>

      {/* Global Feedback Banner */}
      {actionFeedback?.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionFeedback.error}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-red-500 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionFeedback?.success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-neutral-500">
              Total Accounts
            </CardTitle>
            <Users className="w-4 h-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-neutral-950 font-mono">
              {initialStats.totalUsers}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">All registered entities</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-neutral-500">
              Retail Customers
            </CardTitle>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-neutral-950 font-mono">
              {initialStats.customerCount}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Storefront consumers</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-neutral-500">
              Staff & Admins
            </CardTitle>
            <Shield className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-neutral-950 font-mono">
              {initialStats.staffCount + initialStats.adminCount + initialStats.ownerCount}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Elevated console access</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-neutral-500">
              Suspended Accounts
            </CardTitle>
            <UserX className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-neutral-950 font-mono">
              {initialStats.suspendedCount + initialStats.disabledCount}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Blocked or inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Controls */}
      <Card className="rounded-none border-neutral-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="search-users-input"
                type="text"
                placeholder="Search by client name, email, or telephone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 text-xs bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-3">
              <div className="w-36">
                <select
                  id="filter-role-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                >
                  <option value="all">All Roles</option>
                  <option value="customer">Customers</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admins</option>
                  <option value="owner">Owners</option>
                </select>
              </div>

              <div className="w-36">
                <select
                  id="filter-status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {(searchQuery || selectedRole !== "all" || selectedStatus !== "all") && (
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedRole("all");
                    setSelectedStatus("all");
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-neutral-500 whitespace-nowrap"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Data Table */}
      <div className="border border-neutral-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50">
              <TableHead className="w-[300px]">User & Identity</TableHead>
              <TableHead>Authorization Role</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-neutral-400">
                  No accounts matching query criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => {
                const isTargetModifiable = canModifyUserWithRole(currentUser.role, u.role);
                const isSelf = u.id === currentUser.id;

                return (
                  <TableRow key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 font-medium text-xs">
                          {u.firstName?.[0] || "U"}
                          {u.lastName?.[0] || ""}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-950">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-500">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>{getRoleBadge(u.role)}</TableCell>

                    <TableCell>{getStatusBadge(u.status)}</TableCell>

                    <TableCell className="text-xs text-neutral-500">
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-xs text-neutral-500">
                      {u.lastLoginAt ? (
                        new Date(u.lastLoginAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      ) : (
                        <span className="text-neutral-300">Never</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspect User Profile */}
                        <Button
                          onClick={() => handleInspectUser(u)}
                          variant="ghost"
                          size="sm"
                          className="text-xs text-neutral-600 hover:text-neutral-950"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Inspect
                        </Button>

                        {/* Adjust Role (if permitted) */}
                        {canUpdateRole && isTargetModifiable && (
                          <Button
                            onClick={() => {
                              setSelectedUserForRole(u);
                              setNewRoleValue(u.role);
                              setIsRoleModalOpen(true);
                              setActionFeedback(null);
                            }}
                            variant="outline"
                            size="sm"
                            className="text-[11px] uppercase tracking-wider"
                          >
                            Role
                          </Button>
                        )}

                        {/* Toggle Status (Suspend / Activate) */}
                        {canUpdateUser && isTargetModifiable && !isSelf && (
                          <Button
                            onClick={() => handleToggleStatus(u)}
                            variant={u.status === "active" ? "ghost" : "outline"}
                            size="sm"
                            disabled={actionLoading}
                            className={`text-[11px] uppercase tracking-wider ${
                              u.status === "active"
                                ? "text-amber-700 hover:bg-amber-50"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {u.status === "active" ? "Suspend" : "Activate"}
                          </Button>
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

      {/* USER DETAILS INSPECTION DRAWER / MODAL */}
      <Modal
        isOpen={!!inspectingUser}
        onClose={() => setInspectingUser(null)}
        title={inspectingUser ? `${inspectingUser.firstName} ${inspectingUser.lastName}` : "Client Dossier"}
        description={inspectingUser ? `Account ID: ${inspectingUser.id}` : undefined}
        maxWidth="lg"
      >
        {inspectingUser && (
          <div className="space-y-6">
            {loadingDetails && (
              <div className="py-2 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching ledger history...
              </div>
            )}

            {/* Profile Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-neutral-50 border border-neutral-200">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Role</span>
                <div className="mt-1">{getRoleBadge(inspectingUser.role)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Status</span>
                <div className="mt-1">{getStatusBadge(inspectingUser.status)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Lifetime Orders</span>
                <span className="text-sm font-mono font-medium text-neutral-900 mt-1 block">
                  {inspectingUser.ordersCount || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Total Spend</span>
                <span className="text-sm font-mono font-medium text-neutral-900 mt-1 block">
                  ${(inspectingUser.totalSpend || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2 text-xs">
              <h3 className="font-medium uppercase tracking-wider text-neutral-900">Contact Particulars</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600">
                <p>Email: <span className="font-mono text-neutral-900">{inspectingUser.email}</span></p>
                <p>Phone: <span className="font-mono text-neutral-900">{inspectingUser.phone || "None on file"}</span></p>
                <p>Registered: <span className="text-neutral-900">{new Date(inspectingUser.createdAt).toLocaleString()}</span></p>
                <p>Last Session: <span className="text-neutral-900">{inspectingUser.lastLoginAt ? new Date(inspectingUser.lastLoginAt).toLocaleString() : "Never"}</span></p>
              </div>
            </div>

            {/* Delivery Addresses */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-900">
                Registered Addresses ({(inspectingUser.addresses || []).length})
              </h3>
              {(!inspectingUser.addresses || inspectingUser.addresses.length === 0) ? (
                <p className="text-xs text-neutral-400 italic">No saved delivery destinations.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inspectingUser.addresses.map((addr) => (
                    <div key={addr.id} className="p-3 border border-neutral-200 text-xs text-neutral-600 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-neutral-900">{addr.recipientName}</span>
                        {addr.isDefault && (
                          <span className="text-[9px] uppercase font-mono bg-neutral-100 px-1 py-0.5">Default</span>
                        )}
                      </div>
                      <p>{addr.addressLine1}</p>
                      {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                      <p>{addr.city}, {addr.stateProvince} {addr.postalCode}</p>
                      <p className="font-mono text-[11px] text-neutral-400">{addr.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders History */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-900">
                Recent Orders ({(inspectingUser.orders || []).length})
              </h3>
              {(!inspectingUser.orders || inspectingUser.orders.length === 0) ? (
                <p className="text-xs text-neutral-400 italic">No previous purchase records found.</p>
              ) : (
                <div className="border border-neutral-200 divide-y divide-neutral-100 text-xs">
                  {inspectingUser.orders.map((o) => (
                    <div key={o.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-neutral-900">{o.orderNumber}</span>
                          <Badge variant="outline" className="text-[9px] uppercase">{o.orderStatus}</Badge>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString()} · {o.itemsCount} item(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-medium text-neutral-900">
                          ${o.totalAmount.toFixed(2)} {o.currency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="pt-4 border-t border-neutral-200 flex justify-end gap-2">
              <Link href={`/admin/customers/${inspectingUser.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs uppercase tracking-wider"
                >
                  Full Profile Page
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingUser(null)}
                className="text-xs uppercase tracking-wider"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ROLE MODIFICATION MODAL */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedUserForRole(null);
        }}
        title="Adjust Account Authorization"
        description={selectedUserForRole ? `Modify authorization role for ${selectedUserForRole.email}` : undefined}
      >
        {selectedUserForRole && (
          <form onSubmit={handleSaveRole} className="space-y-4">
            <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs space-y-1">
              <p>Current Role: <span className="font-mono font-medium text-neutral-900 uppercase">{selectedUserForRole.role}</span></p>
              <p className="text-neutral-500 text-[11px]">
                Privilege Escalation Rules: You cannot elevate any user to a tier equal to or higher than your own credentials.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-700 mb-1.5">
                Designate New Role
              </label>
              <select
                id="select-role-input"
                value={newRoleValue}
                onChange={(e) => setNewRoleValue(e.target.value as UserRole)}
                className="w-full py-2.5 px-3 border border-neutral-300 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
              >
                <option value="customer" disabled={!canAssignRole(currentUser.role, "customer")}>
                  Customer (Storefront shopper)
                </option>
                <option value="staff" disabled={!canAssignRole(currentUser.role, "staff")}>
                  Staff (Fulfillment & catalog manager)
                </option>
                <option value="admin" disabled={!canAssignRole(currentUser.role, "admin")}>
                  Admin (Store manager & staff administrator)
                </option>
                <option value="owner" disabled={!canAssignRole(currentUser.role, "owner")}>
                  Owner (Full root executive access)
                </option>
              </select>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                id="submit-role-change-btn"
                type="submit"
                variant="primary"
                size="sm"
                disabled={actionLoading}
                className="text-xs uppercase tracking-wider"
              >
                {actionLoading ? "Updating..." : "Confirm Role Update"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* REGISTER CLIENT MODAL */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Register Client Profile"
        description="Provision a new verified retail account directly within the administrative directory."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="cust-first-name"
              name="firstName"
              label="First Name"
              placeholder="Alexander"
              required
            />
            <Input
              id="cust-last-name"
              name="lastName"
              label="Last Name"
              placeholder="McQueen"
              required
            />
          </div>

          <Input
            id="cust-email"
            name="email"
            type="email"
            label="Client Email"
            placeholder="client@couture.com"
            required
          />

          <Input
            id="cust-phone"
            name="phone"
            type="tel"
            label="Contact Telephone"
            placeholder="+1 (555) 019-2831"
          />

          <Input
            id="cust-password"
            name="password"
            type="password"
            label="Initial Temporary Password"
            defaultValue="ClientAccess2026!"
            required
          />

          <p className="text-[11px] text-neutral-400">
            Default credentials will permit initial sign-in. The client may subsequently update credentials within their personal dashboard.
          </p>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddCustomerOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              id="submit-create-customer-btn"
              type="submit"
              variant="primary"
              size="sm"
              disabled={actionLoading}
              className="text-xs uppercase tracking-wider"
            >
              {actionLoading ? "Creating..." : "Register Client"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
