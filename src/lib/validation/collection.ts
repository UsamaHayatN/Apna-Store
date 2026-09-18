import { z } from "zod";

export const collectionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Collection title must be at least 2 characters")
    .max(255, "Collection title cannot exceed 255 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(255, "Slug cannot exceed 255 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens (e.g. 'summer-capsule-2026')"
    ),
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
  isPublished: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
  sortOrder: z.coerce
    .number()
    .int("Sort order must be an integer")
    .min(0, "Sort order must be at least 0")
    .default(0),
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
  startsAt: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val !== "" ? new Date(val).toISOString() : null)),
  endsAt: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val !== "" ? new Date(val).toISOString() : null)),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateCollectionSchema = collectionSchema.partial().extend({
  id: z.string().min(1, "Collection ID is required for updates"),
});

export const collectionProductAssignmentSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const reorderCollectionProductsSchema = z.object({
  productIds: z
    .array(z.string().min(1))
    .min(1, "At least one product ID is required to reorder"),
});

export type CreateCollectionInput = z.infer<typeof collectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
