"use client";

import * as React from "react";
import {
  Search,
  Filter,
  Boxes,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  ArrowUpDown,
  History,
  SlidersHorizontal,
  Download,
  RotateCcw,
  Plus,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  InventoryItemDetail,
  InventorySummaryStats,
  InventoryStockStatus,
} from "@/types";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { InventorySettingsModal } from "./InventorySettingsModal";
import { InventoryHistoryModal } from "./InventoryHistoryModal";

interface AdminInventoryClientProps {
  initialItems: InventoryItemDetail[];
  initialStats: InventorySummaryStats;
}

export function AdminInventoryClient({
  initialItems,
  initialStats,
}: AdminInventoryClientProps) {
  const [items, setItems] = React.useState<InventoryItemDetail[]>(initialItems);
  const [stats, setStats] = React.useState<InventorySummaryStats>(initialStats);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<InventoryStockStatus | "all">("all");
  const [sortBy, setSortBy] = React.useState<"sku" | "title" | "stockQuantity" | "availableQuantity">("title");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [loading, setLoading] = React.useState(false);

  // Active Modals state
  const [selectedAdjustItem, setSelectedAdjustItem] = React.useState<InventoryItemDetail | null>(null);
  const [selectedSettingsItem, setSelectedSettingsItem] = React.useState<InventoryItemDetail | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = React.useState<InventoryItemDetail | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch updated data from API
  const refreshInventory = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        status: statusFilter,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/admin/inventory?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  // Trigger search / filter changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      refreshInventory();
    }, 250);
    return () => clearTimeout(timer);
  }, [refreshInventory]);

  // Callback when stock adjustment or settings modal succeeds
  const handleItemUpdated = (updatedItem: InventoryItemDetail) => {
    setItems((prev) =>
      prev.map((item) => (item.variantId === updatedItem.variantId ? updatedItem : item))
    );
    showToast(`Inventory updated for SKU: ${updatedItem.sku}`);
    refreshInventory();
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      "SKU",
      "Product Title",
      "Variant Title",
      "Barcode",
      "Warehouse Location",
      "On Hand Stock",
      "Reserved Stock",
      "Available Stock",
      "Low Stock Threshold",
      "Reorder Point",
      "Allow Backorder",
      "Status",
      "Retail Price",
      "Cost Price",
    ];

    const rows = items.map((i) => [
      `"${i.sku}"`,
      `"${i.productTitle.replace(/"/g, '""')}"`,
      `"${i.variantTitle.replace(/"/g, '""')}"`,
      `"${i.barcode || ""}"`,
      `"${i.warehouseLocation}"`,
      i.stockQuantity,
      i.reservedQuantity,
      i.availableQuantity,
      i.lowStockThreshold,
      i.reorderPoint,
      i.allowBackorder ? "YES" : "NO",
      i.stockStatus,
      i.price,
      i.costPrice || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `atelier-inventory-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-950 text-white px-4 py-3 rounded-none shadow-xl border border-neutral-800 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Stock Management & Ledger
          </span>
          <h1 className="mt-1 text-2xl font-light uppercase tracking-tight text-neutral-950">
            Inventory Central
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Atomic variant-level stock control, automated low-stock warnings, and audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshInventory()}
            disabled={loading}
            className="text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white border border-neutral-200 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            Active SKUs
          </span>
          <span className="mt-1 text-2xl font-light text-neutral-900 font-mono block">
            {stats.totalSkus}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Unique variants</span>
        </div>

        <div className="bg-white border border-neutral-200 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            On Hand Units
          </span>
          <span className="mt-1 text-2xl font-light text-neutral-900 font-mono block">
            {stats.totalUnitsOnHand}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Physical warehouse count</span>
        </div>

        <div className="bg-white border border-neutral-200 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            Reserved
          </span>
          <span className="mt-1 text-2xl font-light text-neutral-600 font-mono block">
            {stats.totalReservedUnits}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Allocated to orders</span>
        </div>

        <div className="bg-white border border-neutral-200 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            Available to Sell
          </span>
          <span className="mt-1 text-2xl font-light text-emerald-600 font-mono block">
            {stats.totalAvailableUnits}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Net unreserved stock</span>
        </div>

        <div
          onClick={() => setStatusFilter("low_stock")}
          className={`border p-4 cursor-pointer transition-all ${
            statusFilter === "low_stock"
              ? "bg-amber-50/60 border-amber-400 ring-1 ring-amber-400"
              : "bg-white border-neutral-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              Low Stock Alerts
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="mt-1 text-2xl font-light text-amber-600 font-mono block">
            {stats.lowStockCount}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Below trigger threshold</span>
        </div>

        <div
          onClick={() => setStatusFilter("out_of_stock")}
          className={`border p-4 cursor-pointer transition-all ${
            statusFilter === "out_of_stock"
              ? "bg-red-50/60 border-red-400 ring-1 ring-red-400"
              : "bg-white border-neutral-200 hover:border-red-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
              Out of Stock
            </span>
            <PackageX className="w-3.5 h-3.5 text-red-500" />
          </div>
          <span className="mt-1 text-2xl font-light text-red-600 font-mono block">
            {stats.outOfStockCount}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">0 units available</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Filter by SKU, variant title, product title, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Sort Selection */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden"
            >
              <option value="title">Product Title</option>
              <option value="sku">SKU Code</option>
              <option value="stockQuantity">On Hand Stock</option>
              <option value="availableQuantity">Available Stock</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-1.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-600 transition-colors"
              title={`Toggle sort direction (currently ${sortOrder.toUpperCase()})`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 uppercase tracking-wider font-medium text-[11px] transition-colors ${
              statusFilter === "all"
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            All SKUs ({stats.totalSkus})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_stock")}
            className={`px-3 py-1 uppercase tracking-wider font-medium text-[11px] transition-colors ${
              statusFilter === "in_stock"
                ? "bg-emerald-800 text-white"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            In Stock ({stats.totalSkus - stats.lowStockCount - stats.outOfStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("low_stock")}
            className={`px-3 py-1 uppercase tracking-wider font-medium text-[11px] transition-colors flex items-center gap-1.5 ${
              statusFilter === "low_stock"
                ? "bg-amber-600 text-white"
                : "text-amber-700 hover:bg-amber-50"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Low Stock Warnings ({stats.lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("out_of_stock")}
            className={`px-3 py-1 uppercase tracking-wider font-medium text-[11px] transition-colors flex items-center gap-1.5 ${
              statusFilter === "out_of_stock"
                ? "bg-red-700 text-white"
                : "text-red-700 hover:bg-red-50"
            }`}
          >
            <PackageX className="w-3 h-3" />
            Out of Stock ({stats.outOfStockCount})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-neutral-200 overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">SKU / Code</TableHead>
              <TableHead>Product Variant</TableHead>
              <TableHead>Warehouse Hub</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-xs text-neutral-400">
                  {loading ? "Refreshing inventory records..." : "No inventory items matched your criteria."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                return (
                  <TableRow key={item.variantId} className="hover:bg-neutral-50/80 transition-colors">
                    {/* SKU & Barcode */}
                    <TableCell>
                      <div className="font-mono text-xs font-semibold text-neutral-900">
                        {item.sku}
                      </div>
                      {item.barcode && (
                        <div className="text-[10px] text-neutral-400 font-mono">
                          UPC: {item.barcode}
                        </div>
                      )}
                    </TableCell>

                    {/* Product & Variant Attributes */}
                    <TableCell>
                      <div className="font-medium text-xs text-neutral-900">
                        {item.productTitle}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-neutral-800">{item.variantTitle}</span>
                        {Object.entries(item.attributes).map(([key, val]) => (
                          <span
                            key={key}
                            className="inline-block px-1.5 py-0.2 bg-neutral-100 text-neutral-600 text-[10px] rounded uppercase"
                          >
                            {key}: {val}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    {/* Warehouse Location */}
                    <TableCell>
                      <span className="text-[11px] text-neutral-600 block">
                        {item.warehouseLocation}
                      </span>
                      {item.allowBackorder && (
                        <span className="text-[9px] uppercase tracking-wider text-blue-600 font-semibold">
                          Backorders Allowed
                        </span>
                      )}
                    </TableCell>

                    {/* Stock Numbers */}
                    <TableCell className="text-right font-mono text-xs text-neutral-900 font-medium">
                      {item.stockQuantity}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-neutral-400">
                      {item.reservedQuantity}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold">
                      <span
                        className={
                          item.availableQuantity === 0
                            ? "text-red-600"
                            : item.availableQuantity <= item.lowStockThreshold
                            ? "text-amber-600"
                            : "text-emerald-700"
                        }
                      >
                        {item.availableQuantity}
                      </span>
                    </TableCell>

                    {/* Stock Status Badge */}
                    <TableCell>
                      {item.stockStatus === "in_stock" && (
                        <Badge variant="success" className="text-[10px] uppercase tracking-wider">
                          In Stock
                        </Badge>
                      )}
                      {item.stockStatus === "low_stock" && (
                        <Badge variant="warning" className="text-[10px] uppercase tracking-wider">
                          Low Stock ({item.availableQuantity} left)
                        </Badge>
                      )}
                      {item.stockStatus === "out_of_stock" && (
                        <Badge variant="danger" className="text-[10px] uppercase tracking-wider">
                          Out of Stock
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action Controls */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAdjustItem(item)}
                          className="text-[11px] uppercase tracking-wider px-2.5 py-1 h-7 text-neutral-900 hover:bg-neutral-900 hover:text-white"
                        >
                          Adjust
                        </Button>

                        <button
                          type="button"
                          onClick={() => setSelectedSettingsItem(item)}
                          title="Configure thresholds and policy"
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedHistoryItem(item)}
                          title="View audit ledger history"
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <StockAdjustmentModal
        item={selectedAdjustItem}
        isOpen={Boolean(selectedAdjustItem)}
        onClose={() => setSelectedAdjustItem(null)}
        onSuccess={handleItemUpdated}
      />

      <InventorySettingsModal
        item={selectedSettingsItem}
        isOpen={Boolean(selectedSettingsItem)}
        onClose={() => setSelectedSettingsItem(null)}
        onSuccess={handleItemUpdated}
      />

      <InventoryHistoryModal
        item={selectedHistoryItem}
        isOpen={Boolean(selectedHistoryItem)}
        onClose={() => setSelectedHistoryItem(null)}
      />
    </div>
  );
}
