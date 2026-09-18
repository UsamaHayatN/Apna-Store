"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Eye,
  Calendar,
  DollarSign,
  PackageCheck,
  Search,
  Filter,
  Truck,
  CreditCard,
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { OrderRecord } from "@/lib/orders/order-service";

interface AdminOrdersClientProps {
  orders: OrderRecord[];
}

export function AdminOrdersClient({ orders }: AdminOrdersClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const paidOrders = orders.filter((o) => o.paymentStatus === "paid").length;

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        (o.shippingAddressSnapshot?.recipientName || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || o.orderStatus === statusFilter;
      const matchesPayment = paymentFilter === "all" || o.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Fulfillment Queue & Commercial Ledgers
          </span>
          <h1 className="mt-1 text-2xl font-light uppercase tracking-tight text-neutral-950">
            Customer Orders
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="border border-neutral-200 bg-white px-4 py-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-500">Total Volume:</span>
            <span className="font-mono font-bold text-neutral-950">
              ${totalRevenue.toFixed(2)}
            </span>
          </div>
          <div className="border border-neutral-200 bg-white px-4 py-2 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-500">Total Commissions:</span>
            <span className="font-mono font-bold text-neutral-950">{orders.length}</span>
          </div>
          <div className="border border-neutral-200 bg-white px-4 py-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-500">Settled Payments:</span>
            <span className="font-mono font-bold text-neutral-950">{paidOrders}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-none border-neutral-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Filter by order number, client name, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:border-neutral-950 focus:outline-none"
              >
                <option value="all">All Order Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:border-neutral-950 focus:outline-none"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="partially_refunded">Partially Refunded</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="border border-dashed border-neutral-300 p-12 text-center bg-white">
          <ShoppingBag className="mx-auto h-10 w-10 text-neutral-300 stroke-1 mb-3" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
            No Matching Orders Found
          </h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
            {orders.length === 0
              ? "When customer transactions occur through the Atelier checkout pipeline, orders will appear here for packaging, label generation, and fulfillment tracking."
              : "Try adjusting your search query or filters to find specific orders."}
          </p>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white shadow-xs overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-600">
                <TableHead>Order #</TableHead>
                <TableHead>Client / Email</TableHead>
                <TableHead>Date Placed</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead className="text-right">Inspection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-neutral-100">
              {filteredOrders.map((o) => (
                <TableRow key={o.id} className="hover:bg-neutral-50/50">
                  <TableCell className="font-mono font-bold text-neutral-950">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="hover:underline hover:text-neutral-700"
                    >
                      {o.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-neutral-900">
                      {o.shippingAddressSnapshot?.recipientName || "Private Client"}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      {o.customerEmail}
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {o.items.reduce((s, it) => s + it.quantity, 0)} pairs
                  </TableCell>
                  <TableCell className="font-mono font-bold text-neutral-950">
                    ${o.totalAmount.toFixed(2)} {o.currency}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        o.orderStatus === "completed"
                          ? "success"
                          : o.orderStatus === "cancelled"
                          ? "danger"
                          : "outline"
                      }
                      className="text-[10px] uppercase"
                    >
                      {o.orderStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        o.paymentStatus === "paid"
                          ? "success"
                          : o.paymentStatus === "refunded"
                          ? "danger"
                          : "neutral"
                      }
                      className="text-[10px] uppercase"
                    >
                      {o.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {o.fulfillmentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/orders/${o.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] uppercase tracking-wider h-8"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Manage
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
