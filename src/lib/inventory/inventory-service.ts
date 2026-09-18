import { eq, desc, asc, and, or, sql, like, ilike } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import {
  inventoryLevels,
  inventoryTransactions,
  productVariants,
  products,
  productMedia,
} from "@/lib/db/schema";
import {
  InventoryItemDetail,
  InventoryTransactionDetail,
  InventorySummaryStats,
  InventoryStockStatus,
  InventoryTransactionReason,
} from "@/types";
import {
  AdjustInventoryInput,
  UpdateInventorySettingsInput,
  InventoryFilterInput,
} from "@/lib/validation/inventory";
import { recordAuditLog } from "@/lib/audit";
import { INITIAL_VARIANTS } from "@/lib/products/variant-service";
import { INITIAL_PRODUCTS } from "@/lib/products/product-service";

// In-Memory state for development and testing when Postgres is not active
declare global {
  // eslint-disable-next-line no-var
  var _memoryInventoryLevels: Map<string, InventoryItemDetail> | undefined;
  // eslint-disable-next-line no-var
  var _memoryInventoryTransactions: InventoryTransactionDetail[] | undefined;
}

/**
 * Initializes the in-memory inventory state from seeded variants and products.
 */
function getMemoryInventory(): {
  levels: Map<string, InventoryItemDetail>;
  transactions: InventoryTransactionDetail[];
} {
  if (!global._memoryInventoryLevels) {
    const map = new Map<string, InventoryItemDetail>();
    const txs: InventoryTransactionDetail[] = [];

    // Map products by ID for fast lookup
    const prodMap = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));

    for (const v of INITIAL_VARIANTS) {
      const prod = prodMap.get(v.productId);
      const stock = v.stockQuantity ?? 15;
      const reserved = 0;
      const available = Math.max(0, stock - reserved);
      const lowThreshold = 5;

      let status: InventoryStockStatus = "in_stock";
      if (available === 0) status = "out_of_stock";
      else if (available <= lowThreshold) status = "low_stock";

      const attrMap: Record<string, string> = {};
      if (v.attributes) {
        for (const [k, val] of Object.entries(v.attributes)) {
          if (val !== undefined && val !== null) {
            attrMap[k] = String(val);
          }
        }
      }

      const item: InventoryItemDetail = {
        id: `inv-${v.id}`,
        variantId: v.id,
        sku: v.sku,
        barcode: v.barcode || null,
        productTitle: prod ? prod.title : "Product Item",
        variantTitle: v.title,
        productId: v.productId,
        warehouseLocation: "Main Fulfillment Hub (Bay A)",
        stockQuantity: stock,
        reservedQuantity: reserved,
        availableQuantity: available,
        lowStockThreshold: lowThreshold,
        reorderPoint: 10,
        allowBackorder: false,
        stockStatus: status,
        attributes: attrMap,
        thumbnailUrl: (v.images && v.images[0]) || (prod?.media && prod.media[0]?.url) || null,
        price: v.priceOverride ?? (prod ? prod.basePrice : 0),
        costPrice: v.costPrice ?? (prod?.costPrice || null),
        updatedAt: new Date().toISOString(),
      };

      map.set(v.id, item);

      // Initial baseline restock transaction
      txs.push({
        id: `tx-init-${v.id}`,
        variantId: v.id,
        sku: v.sku,
        variantTitle: v.title,
        productTitle: item.productTitle,
        orderId: null,
        changeQuantity: stock,
        resultingQuantity: stock,
        reason: "restock",
        performedByUserId: "usr-dev-owner-usama",
        performedByName: "System Initializer",
        notes: "Baseline catalog opening inventory allocation",
        createdAt: v.createdAt || new Date().toISOString(),
      });
    }

    global._memoryInventoryLevels = map;
    global._memoryInventoryTransactions = txs;
  }

  return {
    levels: global._memoryInventoryLevels,
    transactions: global._memoryInventoryTransactions!,
  };
}

export class InventoryService {
  /**
   * Retrieves paginated or filtered list of inventory records with status metrics.
   */
  async listInventory(
    filters?: InventoryFilterInput
  ): Promise<{ items: InventoryItemDetail[]; stats: InventorySummaryStats }> {
    const query = (filters?.query || "").toLowerCase().trim();
    const statusFilter = filters?.status || "all";
    const sortBy = filters?.sortBy || "title";
    const sortOrder = filters?.sortOrder || "asc";

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();

        // Query inventory levels joined with product_variants and products
        const rows = await db
          .select({
            invId: inventoryLevels.id,
            variantId: inventoryLevels.variantId,
            warehouseLocation: inventoryLevels.warehouseLocation,
            stockQuantity: inventoryLevels.stockQuantity,
            reservedQuantity: inventoryLevels.reservedQuantity,
            lowStockThreshold: inventoryLevels.lowStockThreshold,
            reorderPoint: inventoryLevels.reorderPoint,
            allowBackorder: inventoryLevels.allowBackorder,
            invUpdatedAt: inventoryLevels.updatedAt,
            sku: productVariants.sku,
            barcode: productVariants.barcode,
            variantTitle: productVariants.title,
            productId: productVariants.productId,
            priceOverride: productVariants.priceOverride,
            costPrice: productVariants.costPrice,
            attributesSummary: productVariants.attributesSummary,
            productTitle: products.title,
            productPrice: products.basePrice,
            productCostPrice: products.costPrice,
          })
          .from(inventoryLevels)
          .innerJoin(productVariants, eq(inventoryLevels.variantId, productVariants.id))
          .innerJoin(products, eq(productVariants.productId, products.id));

        const allItems: InventoryItemDetail[] = rows.map((r) => {
          const stock = Number(r.stockQuantity || 0);
          const reserved = Number(r.reservedQuantity || 0);
          const available = Math.max(0, stock - reserved);
          const threshold = Number(r.lowStockThreshold || 5);

          let status: InventoryStockStatus = "in_stock";
          if (available <= 0) status = "out_of_stock";
          else if (available <= threshold) status = "low_stock";

          return {
            id: r.invId,
            variantId: r.variantId,
            sku: r.sku,
            barcode: r.barcode || null,
            productTitle: r.productTitle,
            variantTitle: r.variantTitle,
            productId: r.productId,
            warehouseLocation: r.warehouseLocation || "Main Fulfillment Hub",
            stockQuantity: stock,
            reservedQuantity: reserved,
            availableQuantity: available,
            lowStockThreshold: threshold,
            reorderPoint: Number(r.reorderPoint || 10),
            allowBackorder: Boolean(r.allowBackorder),
            stockStatus: status,
            attributes: (r.attributesSummary as Record<string, string>) || {},
            thumbnailUrl: null,
            price: r.priceOverride ? Number(r.priceOverride) : Number(r.productPrice || 0),
            costPrice: r.costPrice ? Number(r.costPrice) : (r.productCostPrice ? Number(r.productCostPrice) : null),
            updatedAt: r.invUpdatedAt.toISOString(),
          };
        });

        return this.processAndFilter(allItems, query, statusFilter, sortBy, sortOrder);
      } catch (err) {
        console.warn("Inventory DB query failed, falling back to memory store:", err);
      }
    }

    const { levels } = getMemoryInventory();
    const items = Array.from(levels.values());
    return this.processAndFilter(items, query, statusFilter, sortBy, sortOrder);
  }

  private processAndFilter(
    allItems: InventoryItemDetail[],
    query: string,
    statusFilter: string,
    sortBy: string,
    sortOrder: "asc" | "desc"
  ): { items: InventoryItemDetail[]; stats: InventorySummaryStats } {
    // 1. Calculate Aggregate Global Statistics
    let totalUnitsOnHand = 0;
    let totalReservedUnits = 0;
    let totalAvailableUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inventoryValuation = 0;

    for (const item of allItems) {
      totalUnitsOnHand += item.stockQuantity;
      totalReservedUnits += item.reservedQuantity;
      totalAvailableUnits += item.availableQuantity;
      inventoryValuation += item.stockQuantity * (item.costPrice || item.price || 0);

      if (item.stockStatus === "out_of_stock") {
        outOfStockCount++;
      } else if (item.stockStatus === "low_stock") {
        lowStockCount++;
      }
    }

    const stats: InventorySummaryStats = {
      totalSkus: allItems.length,
      totalUnitsOnHand,
      totalReservedUnits,
      totalAvailableUnits,
      lowStockCount,
      outOfStockCount,
      inventoryValuation: Math.round(inventoryValuation * 100) / 100,
    };

    // 2. Filter by search query
    let filtered = allItems;
    if (query) {
      filtered = filtered.filter(
        (item) =>
          item.sku.toLowerCase().includes(query) ||
          item.productTitle.toLowerCase().includes(query) ||
          item.variantTitle.toLowerCase().includes(query) ||
          (item.barcode && item.barcode.toLowerCase().includes(query)) ||
          Object.values(item.attributes).some((v) => v.toLowerCase().includes(query))
      );
    }

    // 3. Filter by stock status
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.stockStatus === statusFilter);
    }

    // 4. Sort results
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "sku") {
        comparison = a.sku.localeCompare(b.sku);
      } else if (sortBy === "stockQuantity") {
        comparison = a.stockQuantity - b.stockQuantity;
      } else if (sortBy === "availableQuantity") {
        comparison = a.availableQuantity - b.availableQuantity;
      } else {
        comparison = a.productTitle.localeCompare(b.productTitle);
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    return { items: filtered, stats };
  }

  /**
   * Retrieves single inventory record for a specific variant.
   */
  async getInventoryItem(variantId: string): Promise<InventoryItemDetail | null> {
    const list = await this.listInventory();
    return list.items.find((item) => item.variantId === variantId) || null;
  }

  /**
   * Performs an atomic inventory adjustment and writes an immutable ledger entry.
   */
  async adjustStock(
    input: AdjustInventoryInput & {
      performedByUserId?: string | null;
      performedByName?: string | null;
      orderId?: string | null;
    }
  ): Promise<{
    item: InventoryItemDetail;
    transaction: InventoryTransactionDetail;
  }> {
    const nowIso = new Date().toISOString();

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();

        return await db.transaction(async (tx) => {
          // Select existing level with lock
          const [level] = await tx
            .select()
            .from(inventoryLevels)
            .where(eq(inventoryLevels.variantId, input.variantId))
            .limit(1);

          if (!level) {
            throw new Error(`Inventory level record not found for variant ${input.variantId}`);
          }

          const currentStock = Number(level.stockQuantity);
          let newStock = currentStock;

          if (input.adjustmentType === "absolute") {
            newStock = input.quantity;
          } else {
            newStock = currentStock + input.quantity;
          }

          if (newStock < 0 && !level.allowBackorder) {
            throw new Error(
              `Insufficient inventory on hand. Stock cannot drop below 0 (current: ${currentStock}, adjustment: ${input.quantity}).`
            );
          }

          const delta = newStock - currentStock;

          // Update inventory level
          await tx
            .update(inventoryLevels)
            .set({
              stockQuantity: newStock,
              updatedAt: new Date(),
            })
            .where(eq(inventoryLevels.id, level.id));

          // Insert immutable transaction
          const [insertedTx] = await tx
            .insert(inventoryTransactions)
            .values({
              variantId: input.variantId,
              orderId: input.orderId || null,
              changeQuantity: delta,
              resultingQuantity: newStock,
              reason: input.reason,
              performedByUserId: input.performedByUserId || null,
              notes: input.notes || null,
            })
            .returning();

          // Fetch variant info for response
          const [variant] = await tx
            .select()
            .from(productVariants)
            .where(eq(productVariants.id, input.variantId))
            .limit(1);

          const available = Math.max(0, newStock - Number(level.reservedQuantity));
          let status: InventoryStockStatus = "in_stock";
          if (available <= 0) status = "out_of_stock";
          else if (available <= Number(level.lowStockThreshold)) status = "low_stock";

          const updatedItem: InventoryItemDetail = {
            id: level.id,
            variantId: level.variantId,
            sku: variant?.sku || "SKU",
            barcode: variant?.barcode || null,
            productTitle: "Product",
            variantTitle: variant?.title || "Variant",
            productId: variant?.productId || "",
            warehouseLocation: level.warehouseLocation || "Main Fulfillment Hub",
            stockQuantity: newStock,
            reservedQuantity: Number(level.reservedQuantity),
            availableQuantity: available,
            lowStockThreshold: Number(level.lowStockThreshold),
            reorderPoint: Number(level.reorderPoint || 10),
            allowBackorder: Boolean(level.allowBackorder),
            stockStatus: status,
            attributes: (variant?.attributesSummary as Record<string, string>) || {},
            thumbnailUrl: null,
            price: variant?.priceOverride ? Number(variant.priceOverride) : 0,
            costPrice: variant?.costPrice ? Number(variant.costPrice) : null,
            updatedAt: nowIso,
          };

          const txDetail: InventoryTransactionDetail = {
            id: insertedTx.id,
            variantId: input.variantId,
            sku: variant?.sku,
            variantTitle: variant?.title,
            orderId: input.orderId || null,
            changeQuantity: delta,
            resultingQuantity: newStock,
            reason: input.reason,
            performedByUserId: input.performedByUserId || null,
            performedByName: input.performedByName || "Admin User",
            notes: input.notes || null,
            createdAt: nowIso,
          };

          await recordAuditLog({
            userId: input.performedByUserId || null,
            action: "inventory.adjusted",
            entityType: "inventory_level",
            entityId: level.id,
            changes: {
              before: { stockQuantity: currentStock },
              after: { stockQuantity: newStock },
              diff: {
                variantId: input.variantId,
                delta,
                reason: input.reason,
                notes: input.notes,
              },
            },
          });

          return { item: updatedItem, transaction: txDetail };
        });
      } catch (err) {
        console.warn("Database inventory adjustment failed, falling back to memory:", err);
      }
    }

    // In-memory atomic fallback
    const { levels, transactions } = getMemoryInventory();
    const item = levels.get(input.variantId);

    if (!item) {
      throw new Error(`Variant ${input.variantId} not found in inventory.`);
    }

    const currentStock = item.stockQuantity;
    let newStock = currentStock;

    if (input.adjustmentType === "absolute") {
      newStock = input.quantity;
    } else {
      newStock = currentStock + input.quantity;
    }

    if (newStock < 0 && !item.allowBackorder) {
      throw new Error(
        `Insufficient inventory. Stock cannot drop below 0 (current: ${currentStock}, adjustment: ${input.quantity}).`
      );
    }

    const delta = newStock - currentStock;
    const available = Math.max(0, newStock - item.reservedQuantity);

    let status: InventoryStockStatus = "in_stock";
    if (available <= 0) status = "out_of_stock";
    else if (available <= item.lowStockThreshold) status = "low_stock";

    item.stockQuantity = newStock;
    item.availableQuantity = available;
    item.stockStatus = status;
    item.updatedAt = nowIso;

    const txDetail: InventoryTransactionDetail = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      variantId: item.variantId,
      sku: item.sku,
      variantTitle: item.variantTitle,
      productTitle: item.productTitle,
      orderId: input.orderId || null,
      changeQuantity: delta,
      resultingQuantity: newStock,
      reason: input.reason,
      performedByUserId: input.performedByUserId || "usr-dev-owner-usama",
      performedByName: input.performedByName || "Admin User",
      notes: input.notes || null,
      createdAt: nowIso,
    };

    transactions.unshift(txDetail);

    await recordAuditLog({
      userId: input.performedByUserId || null,
      action: "inventory.adjusted",
      entityType: "inventory_level",
      entityId: item.id,
      changes: {
        before: { stockQuantity: currentStock },
        after: { stockQuantity: newStock },
        diff: {
          variantId: input.variantId,
          delta,
          reason: input.reason,
          notes: input.notes,
        },
      },
    });

    return { item: { ...item }, transaction: txDetail };
  }

  /**
   * Updates operational settings (threshold, reorder point, backorder policy, warehouse).
   */
  async updateSettings(
    variantId: string,
    input: UpdateInventorySettingsInput & { performedByUserId?: string | null }
  ): Promise<InventoryItemDetail> {
    const nowIso = new Date().toISOString();

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(inventoryLevels)
          .set({
            ...(input.lowStockThreshold !== undefined && {
              lowStockThreshold: input.lowStockThreshold,
            }),
            ...(input.reorderPoint !== undefined && {
              reorderPoint: input.reorderPoint,
            }),
            ...(input.allowBackorder !== undefined && {
              allowBackorder: input.allowBackorder,
            }),
            ...(input.warehouseLocation !== undefined && {
              warehouseLocation: input.warehouseLocation,
            }),
            updatedAt: new Date(),
          })
          .where(eq(inventoryLevels.variantId, variantId));

        const updated = await this.getInventoryItem(variantId);
        if (updated) return updated;
      } catch (err) {
        console.warn("DB inventory settings update failed, falling back to memory:", err);
      }
    }

    const { levels } = getMemoryInventory();
    const item = levels.get(variantId);
    if (!item) {
      throw new Error(`Inventory item for variant ${variantId} not found.`);
    }

    if (input.lowStockThreshold !== undefined) {
      item.lowStockThreshold = input.lowStockThreshold;
    }
    if (input.reorderPoint !== undefined) {
      item.reorderPoint = input.reorderPoint;
    }
    if (input.allowBackorder !== undefined) {
      item.allowBackorder = input.allowBackorder;
    }
    if (input.warehouseLocation !== undefined) {
      item.warehouseLocation = input.warehouseLocation;
    }

    // Recompute status
    let status: InventoryStockStatus = "in_stock";
    if (item.availableQuantity <= 0) status = "out_of_stock";
    else if (item.availableQuantity <= item.lowStockThreshold) status = "low_stock";
    item.stockStatus = status;
    item.updatedAt = nowIso;

    await recordAuditLog({
      userId: input.performedByUserId || null,
      action: "inventory.settings_updated",
      entityType: "inventory_level",
      entityId: item.id,
      changes: {
        diff: input,
      },
    });

    return { ...item };
  }

  /**
   * Retrieves transaction ledger history.
   */
  async getTransactions(filters?: {
    variantId?: string;
    limit?: number;
  }): Promise<InventoryTransactionDetail[]> {
    const limit = filters?.limit || 50;

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const baseQuery = db
          .select({
            id: inventoryTransactions.id,
            variantId: inventoryTransactions.variantId,
            orderId: inventoryTransactions.orderId,
            changeQuantity: inventoryTransactions.changeQuantity,
            resultingQuantity: inventoryTransactions.resultingQuantity,
            reason: inventoryTransactions.reason,
            performedByUserId: inventoryTransactions.performedByUserId,
            notes: inventoryTransactions.notes,
            createdAt: inventoryTransactions.createdAt,
            sku: productVariants.sku,
            variantTitle: productVariants.title,
          })
          .from(inventoryTransactions)
          .leftJoin(productVariants, eq(inventoryTransactions.variantId, productVariants.id))
          .orderBy(desc(inventoryTransactions.createdAt))
          .limit(limit);

        if (filters?.variantId) {
          const rows = await db
            .select({
              id: inventoryTransactions.id,
              variantId: inventoryTransactions.variantId,
              orderId: inventoryTransactions.orderId,
              changeQuantity: inventoryTransactions.changeQuantity,
              resultingQuantity: inventoryTransactions.resultingQuantity,
              reason: inventoryTransactions.reason,
              performedByUserId: inventoryTransactions.performedByUserId,
              notes: inventoryTransactions.notes,
              createdAt: inventoryTransactions.createdAt,
              sku: productVariants.sku,
              variantTitle: productVariants.title,
            })
            .from(inventoryTransactions)
            .leftJoin(productVariants, eq(inventoryTransactions.variantId, productVariants.id))
            .where(eq(inventoryTransactions.variantId, filters.variantId))
            .orderBy(desc(inventoryTransactions.createdAt))
            .limit(limit);

          return rows.map((r) => ({
            id: r.id,
            variantId: r.variantId,
            sku: r.sku || undefined,
            variantTitle: r.variantTitle || undefined,
            orderId: r.orderId,
            changeQuantity: Number(r.changeQuantity),
            resultingQuantity: Number(r.resultingQuantity),
            reason: r.reason,
            performedByUserId: r.performedByUserId,
            performedByName: "Staff Member",
            notes: r.notes,
            createdAt: r.createdAt.toISOString(),
          }));
        }

        const rows = await baseQuery;
        return rows.map((r) => ({
          id: r.id,
          variantId: r.variantId,
          sku: r.sku || undefined,
          variantTitle: r.variantTitle || undefined,
          orderId: r.orderId,
          changeQuantity: Number(r.changeQuantity),
          resultingQuantity: Number(r.resultingQuantity),
          reason: r.reason,
          performedByUserId: r.performedByUserId,
          performedByName: "Staff Member",
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
        }));
      } catch (err) {
        console.warn("DB inventory transactions query failed, falling back to memory:", err);
      }
    }

    const { transactions } = getMemoryInventory();
    let result = [...transactions];
    if (filters?.variantId) {
      result = result.filter((t) => t.variantId === filters.variantId);
    }
    return result.slice(0, limit);
  }
}

export const inventoryService = new InventoryService();
