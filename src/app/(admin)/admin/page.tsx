import Link from "next/link";
import {
  Package,
  Boxes,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Tag,
  Users,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { productService } from "@/lib/products/product-service";
import { inventoryService } from "@/lib/inventory/inventory-service";
import { orderService } from "@/lib/orders/order-service";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [productsData, inventoryData, orders] = await Promise.all([
    productService.getProducts({
      status: "all",
      sort: "newest",
      page: 1,
      limit: 1,
    }),
    inventoryService.listInventory(),
    orderService.getAllOrders(),
  ]);

  const { stats } = inventoryData;
  const totalRevenue = orders.reduce((sum, ord) => sum + ord.totalAmount, 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Operations & Control
          </span>
          <h1 className="mt-1 text-2xl font-light uppercase tracking-tight text-neutral-950">
            Executive Commerce Overview
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" className="px-2.5 py-1">
            System Operational
          </Badge>
          <Link href="/shop">
            <Button variant="outline" size="sm">
              <span>View Storefront</span>
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-none border-neutral-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Gross Volume
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-neutral-900 font-mono">
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              From {orders.length} lifetime client commissions
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Inventory Valuation
            </CardTitle>
            <span className="text-xs font-mono text-neutral-400">USD</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-neutral-900 font-mono">
              ${stats.inventoryValuation.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {stats.totalUnitsOnHand} units across {stats.totalSkus} SKUs
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Available Stock
            </CardTitle>
            <Boxes className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-emerald-600 font-mono">
              {stats.totalAvailableUnits} Units
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {stats.totalReservedUnits} reserved for fulfillment
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Catalog Health
            </CardTitle>
            {stats.lowStockCount > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <Package className="h-4 w-4 text-neutral-400" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-light font-mono ${
                stats.lowStockCount > 0 ? "text-amber-600" : "text-neutral-900"
              }`}
            >
              {productsData.total} Silhouettes
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {stats.lowStockCount > 0
                ? `${stats.lowStockCount} low stock alerts flagged`
                : "All product variants stocked"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Commissions Overview */}
      <Card className="rounded-none border-neutral-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-950">
              Recent Client Commissions
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500 mt-0.5">
              Latest client acquisitions across bespoke footwear silhouettes
            </CardDescription>
          </div>
          <Link href="/admin/orders">
            <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider">
              <span>View All ({orders.length})</span>
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No commissions recorded yet. Completed checkouts will appear here immediately.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-900">
                          {ord.orderNumber}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {ord.orderStatus}
                        </Badge>
                        <Badge variant="neutral" className="text-[10px] uppercase">
                          {ord.paymentStatus}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {ord.customerEmail} • {ord.items.length} {ord.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:justify-end">
                    <span className="text-xs font-mono font-semibold text-neutral-950">
                      ${ord.totalAmount.toFixed(2)} {ord.currency}
                    </span>
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {new Date(ord.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modules Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-none border-neutral-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-neutral-700" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-950">
                Catalog & Inventory
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-neutral-500">
              Product silhouettes, variant matrix, and SKU ledger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Maintain footwear listings, manage variant sizes, and record immutable audit adjustments.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/admin/products">
                <Button variant="primary" size="sm" className="text-xs uppercase tracking-wider">
                  Products
                </Button>
              </Link>
              <Link href="/admin/inventory">
                <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider">
                  Ledger
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-neutral-700" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-950">
                Promotions & Vouchers
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-neutral-500">
              Privilege codes, percentage deductions, and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Create seasonal promotional vouchers, set minimum subtotal requirements, and monitor redemptions.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/admin/coupons">
                <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider">
                  Manage Coupons
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-neutral-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-700" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-950">
                Clients & Security
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-neutral-500">
              Client accounts, staff roles, and audit trail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Inspect registered clientele, assign administrative privileges, and review security logs.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/admin/customers">
                <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider">
                  Client Directory
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider">
                  Store Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
