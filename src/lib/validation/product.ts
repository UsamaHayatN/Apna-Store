import { z } from "zod";

export const productStatusSchema = z.enum(["draft", "active", "archived"]);

export const productMediaItemSchema = z.object({
  id: z.string().optional(),
  url: z.string().trim().url("Please enter a valid image URL").min(1, "Image URL is required"),
  altText: z.string().trim().max(255).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

export const createProductSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Product title must be at least 2 characters")
    .max(255, "Product title cannot exceed 255 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(255, "Slug cannot exceed 255 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens (e.g. 'oxford-cap-toe-boot')"
    ),
  brand: z
    .string()
    .trim()
    .min(1, "Brand name is required")
    .max(150, "Brand name cannot exceed 150 characters"),
  productTypeId: z.string().min(1, "Please select a product type"),
  primaryCategoryId: z.string().min(1, "Please select a primary category"),
  modelCode: z.string().trim().max(100).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().min(1, "Product description is required"),
  basePrice: z.coerce
    .number()
    .positive("Base price must be greater than zero"),
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
  status: productStatusSchema.default("draft"),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isOnSale: z.boolean().default(false),
  seoTitle: z.string().trim().max(255).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(500).optional().or(z.literal("")),
  media: z.array(productMediaItemSchema).optional().default([]),
});

export const updateProductSchema = createProductSchema.extend({
  id: z.string().min(1, "Product ID is required"),
});

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  productType: z.string().trim().optional(),
  status: z.enum(["all", "active", "draft", "archived"]).optional().default("all"),
  featured: z.coerce.boolean().optional(),
  newArrival: z.coerce.boolean().optional(),
  onSale: z.coerce.boolean().optional(),
  sort: z
    .enum([
      "newest",
      "oldest",
      "name_asc",
      "name_desc",
      "price_asc",
      "price_desc",
      "updated",
    ])
    .optional()
    .default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductMediaItemInput = z.infer<typeof productMediaItemSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
