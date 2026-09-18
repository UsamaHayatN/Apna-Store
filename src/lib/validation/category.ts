import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(255, "Category name cannot exceed 255 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(255, "Slug cannot exceed 255 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens (e.g. 'dress-shoes')"
    ),
  parentId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val !== "" && val !== "none" ? val : null)),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val !== "" ? val : null)),
  imageUrl: z
    .string()
    .trim()
    .url("Please enter a valid media image URL")
    .optional()
    .or(z.literal(""))
    .nullable()
    .transform((val) => (val && val !== "" ? val : null)),
  imageAlt: z
    .string()
    .trim()
    .max(255, "Image alt text cannot exceed 255 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val !== "" ? val : null)),
  sortOrder: z.coerce
    .number()
    .int("Sort order must be an integer")
    .min(0, "Sort order must be greater than or equal to 0")
    .default(0),
  isActive: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
  seoTitle: z
    .string()
    .trim()
    .max(255, "SEO title cannot exceed 255 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val !== "" ? val : null)),
  seoDescription: z
    .string()
    .trim()
    .max(500, "SEO meta description cannot exceed 500 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val !== "" ? val : null)),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateCategorySchema = categorySchema.partial().extend({
  id: z.string().min(1, "Category ID is required for updates"),
});

export type CreateCategoryInput = z.infer<typeof categorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
