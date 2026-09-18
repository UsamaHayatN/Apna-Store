"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { variantService } from "@/lib/products/variant-service";
import { attributeService } from "@/lib/products/attribute-service";
import {
  createVariantSchema,
  updateVariantSchema,
  generateVariantsSchema,
  createAttributeSchema,
  createAttributeValueSchema,
  updateProductAttributesSchema,
  CreateVariantInput,
  UpdateVariantInput,
  GenerateVariantsInput,
  CreateAttributeInput,
  CreateAttributeValueInput,
  UpdateProductAttributesInput,
} from "@/lib/validation/variant";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Loads all variants for a product
 */
export async function getVariantsByProductAction(
  productId: string,
  options?: { includeArchived?: boolean }
): Promise<ActionResult> {
  try {
    await requirePermission("products.read");
    const variants = await variantService.listVariantsByProductId(productId, options);
    return { success: true, data: variants };
  } catch (error) {
    console.error("getVariantsByProductAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load variants",
    };
  }
}

/**
 * Creates a new product variant
 */
export async function createVariantAction(
  input: CreateVariantInput
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.update");
    const parsed = createVariantSchema.safeParse(input);

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

    const created = await variantService.createVariant(parsed.data, user.id);
    revalidatePath(`/admin/products/${parsed.data.productId}`);
    revalidatePath("/admin/products");
    return { success: true, data: created };
  } catch (error) {
    console.error("createVariantAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create variant",
    };
  }
}

/**
 * Updates an existing product variant
 */
export async function updateVariantAction(
  input: UpdateVariantInput
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.update");
    const parsed = updateVariantSchema.safeParse(input);

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

    const updated = await variantService.updateVariant(parsed.data, user.id);
    revalidatePath(`/admin/products/${parsed.data.productId}`);
    revalidatePath("/admin/products");
    return { success: true, data: updated };
  } catch (error) {
    console.error("updateVariantAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update variant",
    };
  }
}

/**
 * Quick toggle variant active status
 */
export async function toggleVariantStatusAction(
  id: string,
  isActive: boolean,
  productId: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.update");
    const updated = await variantService.toggleVariantStatus(id, isActive, user.id);
    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("toggleVariantStatusAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle status",
    };
  }
}

/**
 * Archives a variant
 */
export async function archiveVariantAction(
  id: string,
  productId: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.update");
    const archived = await variantService.archiveVariant(id, user.id);
    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: archived };
  } catch (error) {
    console.error("archiveVariantAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive variant",
    };
  }
}

/**
 * Restores an archived variant
 */
export async function restoreVariantAction(
  id: string,
  productId: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.update");
    const restored = await variantService.restoreVariant(id, user.id);
    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: restored };
  } catch (error) {
    console.error("restoreVariantAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore variant",
    };
  }
}

/**
 * Deletes a variant
 */
export async function deleteVariantAction(
  id: string,
  productId: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.delete");
    await variantService.deleteVariant(id, user.id);
    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: true };
  } catch (error) {
    console.error("deleteVariantAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete variant",
    };
  }
}

/**
 * Previews combinations generated from attributes
 */
export async function previewGenerateVariantsAction(
  input: GenerateVariantsInput
): Promise<ActionResult> {
  try {
    await requirePermission("products.update");
    const parsed = generateVariantsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid generator configuration",
      };
    }
    const preview = await variantService.previewGenerateVariants(parsed.data);
    return { success: true, data: preview };
  } catch (error) {
    console.error("previewGenerateVariantsAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to preview combinations",
    };
  }
}

/**
 * Bulk creates generated variants
 */
export async function bulkCreateGeneratedVariantsAction(
  input: GenerateVariantsInput,
  selectedCombinations: Array<{
    attributes: Record<string, string>;
    sku: string;
    title: string;
    priceOverride?: number | null;
  }>
): Promise<ActionResult> {
  try {
    const user = await requirePermission("products.update");
    const parsed = generateVariantsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid generator input" };
    }

    const created = await variantService.bulkCreateGeneratedVariants(
      parsed.data,
      selectedCombinations,
      user.id
    );

    revalidatePath(`/admin/products/${parsed.data.productId}`);
    revalidatePath("/admin/products");
    return { success: true, data: created };
  } catch (error) {
    console.error("bulkCreateGeneratedVariantsAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create generated variants",
    };
  }
}

/**
 * Fetches all attributes assigned to a product
 */
export async function getProductAttributesAction(
  productId: string
): Promise<ActionResult> {
  try {
    await requirePermission("products.read");
    const attrs = await attributeService.getProductAttributes(productId);
    return { success: true, data: attrs };
  } catch (error) {
    console.error("getProductAttributesAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load product attributes",
    };
  }
}

/**
 * Updates attributes assigned to a product
 */
export async function updateProductAttributesAction(
  input: UpdateProductAttributesInput
): Promise<ActionResult> {
  try {
    await requirePermission("products.update");
    const parsed = updateProductAttributesSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid product attributes input" };
    }

    const updated = await attributeService.setProductAttributes(
      parsed.data.productId,
      parsed.data.attributeIds
    );

    revalidatePath(`/admin/products/${parsed.data.productId}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("updateProductAttributesAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update attributes",
    };
  }
}

/**
 * Loads all system attributes with values
 */
export async function getAllAttributesAction(): Promise<ActionResult> {
  try {
    await requirePermission("products.read");
    const attrs = await attributeService.listAttributes();
    return { success: true, data: attrs };
  } catch (error) {
    console.error("getAllAttributesAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load attributes",
    };
  }
}

/**
 * Creates a brand new attribute
 */
export async function createAttributeAction(
  input: CreateAttributeInput
): Promise<ActionResult> {
  try {
    await requirePermission("products.update");
    const parsed = createAttributeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid attribute details",
      };
    }
    const created = await attributeService.createAttribute(parsed.data);
    return { success: true, data: created };
  } catch (error) {
    console.error("createAttributeAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create attribute",
    };
  }
}

/**
 * Creates a new value for an attribute
 */
export async function createAttributeValueAction(
  input: CreateAttributeValueInput
): Promise<ActionResult> {
  try {
    await requirePermission("products.update");
    const parsed = createAttributeValueSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid attribute value details",
      };
    }
    const created = await attributeService.createAttributeValue(parsed.data);
    return { success: true, data: created };
  } catch (error) {
    console.error("createAttributeValueAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create attribute value",
    };
  }
}
