"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  FolderTree,
  Layers,
  ShoppingBag,
  Users,
  TicketPercent,
  Settings,
  ArrowUpRight,
  BarChart3,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const adminNavItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Products", href: "/admin/products", icon: Package },
  { title: "Inventory", href: "/admin/inventory", icon: Boxes },
  { title: "Categories", href: "/admin/categories", icon: FolderTree },
  { title: "Collections", href: "/admin/collections", icon: Layers },
  { title: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { title: "Customers", href: "/admin/customers", icon: Users },
  { title: "Coupons", href: "/admin/coupons", icon: TicketPercent },
  { title: "Staff & RBAC", href: "/admin/staff", icon: UserCheck },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-neutral-200 bg-neutral-900 text-neutral-200 flex flex-col justify-between min-h-screen">
      <div>
        {/* Admin Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              {siteConfig.brandName}
            </span>
            <span className="ml-2 text-[10px] uppercase font-semibold text-neutral-400 bg-neutral-800 px-1.5 py-0.5">
              Admin
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors",
                  isActive
                    ? "bg-white text-neutral-950"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Back to Store Link & Sign Out */}
      <div className="p-4 border-t border-neutral-800 space-y-1">
        <Link
          href="/"
          className="flex items-center justify-between px-3.5 py-2 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <span>View Public Store</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}
          className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <span>Exit Console</span>
          <span className="text-[10px] uppercase font-mono">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
