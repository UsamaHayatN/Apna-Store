import { z } from "zod";

export const inventoryTransactionReasonSchema = z.enum([
  "restock",
  "reservation",
  "fulfillment",
  "cancellation_return",
  "damage_adjustment",
  "manual_audit",
]);

export const adjustInventorySchema = z
  .object({
    variantId: z.string().min(1, "Variant ID is required"),
    adjustmentType: z.enum(["relative", "absolute"]),
    quantity: z.coerce
      .number()
      .int("Adjustment quantity must be an integer"),
    reason: inventoryTransactionReasonSchema,
    notes: z
      .string()
      .max(500, "Notes cannot exceed 500 characters")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.adjustmentType === "absolute" && data.quantity < 0) {
        return false;
      }
      if (data.adjustmentType === "relative" && data.quantity === 0) {
        return false;
      }
      return true;
    },
    {
      message: "Absolute stock cannot be negative, and relative adjustment cannot be zero.",
      path: ["quantity"],
    }
  );

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;

export const updateInventorySettingsSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  lowStockThreshold: z.coerce
    .number()
    .int("Threshold must be an integer")
    .min(0, "Threshold cannot be negative")
    .max(10000, "Threshold cannot exceed 10,000")
    .optional(),
  reorderPoint: z.coerce
    .number()
    .int("Reorder point must be an integer")
    .min(0, "Reorder point cannot be negative")
    .max(10000, "Reorder point cannot exceed 10,000")
    .optional(),
  allowBackorder: z.boolean().optional(),
  warehouseLocation: z
    .string()
    .trim()
    .max(100, "Warehouse location cannot exceed 100 characters")
    .optional(),
});

export type UpdateInventorySettingsInput = z.infer<typeof updateInventorySettingsSchema>;

export const inventoryFilterSchema = z.object({
  query: z.string().optional().default(""),
  status: z.enum(["all", "in_stock", "low_stock", "out_of_stock"]).optional().default("all"),
  sortBy: z.enum(["sku", "title", "stockQuantity", "availableQuantity"]).optional().default("title"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export type InventoryFilterInput = z.infer<typeof inventoryFilterSchema>;
