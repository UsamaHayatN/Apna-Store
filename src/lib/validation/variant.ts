import { z } from "zod";

export const variantStatusSchema = z.enum(["active", "inactive", "archived"]);

export const createVariantSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  sku: z
    .string()
    .trim()
    .min(3, "SKU must be at least 3 characters")
    .max(100, "SKU cannot exceed 100 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "SKU can only contain letters, numbers, hyphens, and underscores"),
  barcode: z
    .string()
    .trim()
    .max(100, "Barcode cannot exceed 100 characters")
    .regex(/^[A-Za-z0-9]*$/, "Barcode must be alphanumeric")
    .optional()
    .nullable()
    .or(z.literal("")),
  title: z
    .string()
    .trim()
    .min(1, "Variant title or description is required")
    .max(255, "Variant title cannot exceed 255 characters"),
  priceOverride: z.coerce
    .number()
    .positive("Price override must be greater than zero")
    .optional()
    .nullable(),
  compareAtPrice: z.coerce
    .number()
    .positive("Compare-at price must be greater than zero")
    .optional()
    .nullable(),
  costPrice: z.coerce
    .number()
    .min(0, "Cost price cannot be negative")
    .optional()
    .nullable(),
  weightGrams: z.coerce
    .number()
    .int("Weight must be an integer in grams")
    .min(0, "Weight cannot be negative")
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
  // Key-value pairs: e.g. { "size": "41", "color": "black" }
  attributes: z
    .record(z.string().min(1), z.string().min(1))
    .refine((val) => Object.keys(val).length > 0, {
      message: "At least one product attribute option must be selected",
    }),
  // Optional media assignment (URLs or IDs)
  mediaUrls: z.array(z.string().url("Valid image URL required")).optional().default([]),
});

export const updateVariantSchema = z.object({
  id: z.string().min(1, "Variant ID is required"),
  productId: z.string().min(1, "Product ID is required"),
  sku: z
    .string()
    .trim()
    .min(3, "SKU must be at least 3 characters")
    .max(100, "SKU cannot exceed 100 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "SKU can only contain letters, numbers, hyphens, and underscores"),
  barcode: z
    .string()
    .trim()
    .max(100, "Barcode cannot exceed 100 characters")
    .regex(/^[A-Za-z0-9]*$/, "Barcode must be alphanumeric")
    .optional()
    .nullable()
    .or(z.literal("")),
  title: z
    .string()
    .trim()
    .min(1, "Variant title or description is required")
    .max(255, "Variant title cannot exceed 255 characters"),
  priceOverride: z.coerce
    .number()
    .positive("Price override must be greater than zero")
    .optional()
    .nullable(),
  compareAtPrice: z.coerce
    .number()
    .positive("Compare-at price must be greater than zero")
    .optional()
    .nullable(),
  costPrice: z.coerce
    .number()
    .min(0, "Cost price cannot be negative")
    .optional()
    .nullable(),
  weightGrams: z.coerce
    .number()
    .int("Weight must be an integer in grams")
    .min(0, "Weight cannot be negative")
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
  attributes: z
    .record(z.string().min(1), z.string().min(1))
    .refine((val) => Object.keys(val).length > 0, {
      message: "At least one product attribute option must be selected",
    }),
  mediaUrls: z.array(z.string().url("Valid image URL required")).optional().default([]),
});

export const generateVariantsSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  skuPrefix: z
    .string()
    .trim()
    .min(2, "SKU Prefix must be at least 2 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "SKU prefix can only contain letters, numbers, and hyphens"),
  basePriceOverride: z.coerce
    .number()
    .positive("Price override must be greater than zero")
    .optional()
    .nullable(),
  attributeOptions: z.record(
    z.string().min(1),
    z.array(z.string().min(1)).min(1, "Select at least one value per attribute")
  ),
});

export const createAttributeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(/^[a-z0-9_-]+$/, "Code must be lowercase alphanumeric with hyphens or underscores"),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  type: z.enum(["select", "color_swatch", "button_pill", "text"]).default("select"),
  displayOrder: z.coerce.number().int().default(0),
});

export const createAttributeValueSchema = z.object({
  attributeId: z.string().min(1, "Attribute ID is required"),
  value: z
    .string()
    .trim()
    .min(1, "Value is required")
    .max(100, "Value cannot exceed 100 characters"),
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(100, "Label cannot exceed 100 characters"),
  colorHex: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color hex format (e.g. #111111)")
    .optional()
    .nullable()
    .or(z.literal("")),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateProductAttributesSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  attributeIds: z.array(z.string().min(1)),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type GenerateVariantsInput = z.infer<typeof generateVariantsSchema>;
export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;
export type CreateAttributeValueInput = z.infer<typeof createAttributeValueSchema>;
export type UpdateProductAttributesInput = z.infer<typeof updateProductAttributesSchema>;
