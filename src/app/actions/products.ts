"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrStaff, requirePermission } from "@/lib/auth/guards";
import { productService } from "@/lib/products/product-service";
import { discoveryService } from "@/lib/storefront/discovery-service";
import { pdpService } from "@/lib/storefront/pdp-service";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from "@/lib/validation/product";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Server action to query products with search, filters, pagination, and sorting
 */
export async function getProductsAction(
  query: ProductQueryInput
): Promise<ActionResult> {
  try {
    await requirePermission("products.read");
    const parsed = productQuerySchema.parse(query);
    const result = await productService.getProducts(parsed);
    return { success: true, data: result };
  } catch (error) {
    console.error("getProductsAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load products",
    };
  }
}

/**
 * Server action to create a new product
 */
export async function createProductAction(
  input: CreateProductInput
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.create");
    const parsed = createProductSchema.safeParse(input);

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      parsed.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });
      return {
        success: false,
        error: "Please correct the highlighted form errors.",
        fieldErrors,
      };
    }

    const created = await productService.createProduct(parsed.data, user.id);
    discoveryService.clearCache();
    pdpService.clearCache();
    revalidatePath("/shop");
    revalidatePath("/category");
    revalidatePath("/collection");
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { success: true, data: created };
  } catch (error) {
    console.error("createProductAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create product",
    };
  }
}

/**
 * Server action to update an existing product
 */
export async function updateProductAction(
  input: UpdateProductInput
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.update");
    const parsed = updateProductSchema.safeParse(input);

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      parsed.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });
      return {
        success: false,
        error: "Please correct the highlighted form errors.",
        fieldErrors,
      };
    }

    const updated = await productService.updateProduct(
      parsed.data.id,
      parsed.data,
      user.id
    );
    discoveryService.clearCache();
    pdpService.clearCache();
    revalidatePath("/shop");
    revalidatePath("/category");
    revalidatePath("/collection");
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${parsed.data.id}`);
    revalidatePath("/admin");
    return { success: true, data: updated };
  } catch (error) {
    console.error("updateProductAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update product",
    };
  }
}

/**
 * Server action to archive a product (soft delete)
 */
export async function archiveProductAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.delete");
    if (!id || typeof id !== "string") {
      return { success: false, error: "Product ID is required" };
    }

    const archived = await productService.archiveProduct(id, user.id);
    discoveryService.clearCache();
    pdpService.clearCache();
    revalidatePath("/shop");
    revalidatePath("/category");
    revalidatePath("/collection");
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/admin");
    return { success: true, data: archived };
  } catch (error) {
    console.error("archiveProductAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive product",
    };
  }
}

/**
 * Server action to restore an archived product back to draft
 */
export async function restoreProductAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.delete");
    if (!id || typeof id !== "string") {
      return { success: false, error: "Product ID is required" };
    }

    const restored = await productService.restoreProduct(id, user.id);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/admin");
    return { success: true, data: restored };
  } catch (error) {
    console.error("restoreProductAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore product",
    };
  }
}

/**
 * Server action to toggle product publication status (active vs draft)
 */
export async function toggleProductPublishAction(
  id: string,
  newStatus: "active" | "draft"
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.update");
    if (!id || typeof id !== "string") {
      return { success: false, error: "Product ID is required" };
    }
    if (newStatus !== "active" && newStatus !== "draft") {
      return { success: false, error: "Invalid product status requested" };
    }

    const updated = await productService.setProductStatus(id, newStatus, user.id);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("toggleProductPublishAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update product status",
    };
  }
}

/**
 * Server action to update merchandising flag
 */
export async function updateProductFlagAction(
  id: string,
  flag: "isFeatured" | "isNewArrival" | "isOnSale",
  value: boolean
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.update");
    const updated = await productService.updateMerchandisingFlag(
      id,
      flag,
      value,
      user.id
    );
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("updateProductFlagAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update product flag",
    };
  }
}
