import { eq, asc, and, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import {
  attributes as attributesTable,
  attributeValues as attributeValuesTable,
  productAttributes as productAttributesTable,
} from "@/lib/db/schema";
import { Attribute, AttributeValue, ProductAttribute } from "@/types";
import {
  CreateAttributeInput,
  CreateAttributeValueInput,
} from "@/lib/validation/variant";

// =============================================================================
// SEED ATTRIBUTES & VALUES (Generic across Footwear, Apparel, Accessories)
// =============================================================================

export const SEED_ATTRIBUTES: Attribute[] = [
  {
    id: "attr-size",
    code: "size",
    name: "Size",
    type: "button_pill",
    displayOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    values: [
      // Footwear sizes (EU / US benchmark)
      { id: "val-size-39", attributeId: "attr-size", value: "39", label: "EU 39 / US 6.5", sortOrder: 1 },
      { id: "val-size-40", attributeId: "attr-size", value: "40", label: "EU 40 / US 7.5", sortOrder: 2 },
      { id: "val-size-41", attributeId: "attr-size", value: "41", label: "EU 41 / US 8", sortOrder: 3 },
      { id: "val-size-42", attributeId: "attr-size", value: "42", label: "EU 42 / US 9", sortOrder: 4 },
      { id: "val-size-43", attributeId: "attr-size", value: "43", label: "EU 43 / US 10", sortOrder: 5 },
      { id: "val-size-44", attributeId: "attr-size", value: "44", label: "EU 44 / US 11", sortOrder: 6 },
      { id: "val-size-45", attributeId: "attr-size", value: "45", label: "EU 45 / US 12", sortOrder: 7 },
      // Apparel Alpha sizes
      { id: "val-size-xs", attributeId: "attr-size", value: "XS", label: "Extra Small (XS)", sortOrder: 10 },
      { id: "val-size-s", attributeId: "attr-size", value: "S", label: "Small (S)", sortOrder: 11 },
      { id: "val-size-m", attributeId: "attr-size", value: "M", label: "Medium (M)", sortOrder: 12 },
      { id: "val-size-l", attributeId: "attr-size", value: "L", label: "Large (L)", sortOrder: 13 },
      { id: "val-size-xl", attributeId: "attr-size", value: "XL", label: "Extra Large (XL)", sortOrder: 14 },
      { id: "val-size-xxl", attributeId: "attr-size", value: "XXL", label: "Double XL (XXL)", sortOrder: 15 },
      // One Size for accessories
      { id: "val-size-os", attributeId: "attr-size", value: "OS", label: "One Size", sortOrder: 20 },
    ],
  },
  {
    id: "attr-color",
    code: "color",
    name: "Color",
    type: "color_swatch",
    displayOrder: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    values: [
      { id: "val-color-black", attributeId: "attr-color", value: "black", label: "Onyx Black", colorHex: "#111111", sortOrder: 1 },
      { id: "val-color-white", attributeId: "attr-color", value: "white", label: "Pristine White", colorHex: "#F8F8F8", sortOrder: 2 },
      { id: "val-color-cognac", attributeId: "attr-color", value: "cognac", label: "Cognac Brown", colorHex: "#7B3F00", sortOrder: 3 },
      { id: "val-color-espresso", attributeId: "attr-color", value: "espresso", label: "Espresso Brown", colorHex: "#3D2314", sortOrder: 4 },
      { id: "val-color-navy", attributeId: "attr-color", value: "navy", label: "Midnight Navy", colorHex: "#1B2A4A", sortOrder: 5 },
      { id: "val-color-charcoal", attributeId: "attr-color", value: "charcoal", label: "Charcoal Grey", colorHex: "#36454F", sortOrder: 6 },
      { id: "val-color-burgundy", attributeId: "attr-color", value: "burgundy", label: "Burgundy Wine", colorHex: "#6A1A24", sortOrder: 7 },
      { id: "val-color-olive", attributeId: "attr-color", value: "olive", label: "Olive Drab", colorHex: "#556B2F", sortOrder: 8 },
    ],
  },
  {
    id: "attr-fit",
    code: "fit",
    name: "Fit",
    type: "select",
    displayOrder: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    values: [
      { id: "val-fit-slim", attributeId: "attr-fit", value: "slim", label: "Slim Fit", sortOrder: 1 },
      { id: "val-fit-regular", attributeId: "attr-fit", value: "regular", label: "Regular Fit", sortOrder: 2 },
      { id: "val-fit-relaxed", attributeId: "attr-fit", value: "relaxed", label: "Relaxed Fit", sortOrder: 3 },
      { id: "val-fit-tailored", attributeId: "attr-fit", value: "tailored", label: "Tailored Cut", sortOrder: 4 },
    ],
  },
  {
    id: "attr-waist",
    code: "waist",
    name: "Waist Size",
    type: "select",
    displayOrder: 4,
    createdAt: "2026-01-01T00:00:00.000Z",
    values: [
      { id: "val-waist-28", attributeId: "attr-waist", value: "28", label: "28 Inches", sortOrder: 1 },
      { id: "val-waist-30", attributeId: "attr-waist", value: "30", label: "30 Inches", sortOrder: 2 },
      { id: "val-waist-32", attributeId: "attr-waist", value: "32", label: "32 Inches", sortOrder: 3 },
      { id: "val-waist-34", attributeId: "attr-waist", value: "34", label: "34 Inches", sortOrder: 4 },
      { id: "val-waist-36", attributeId: "attr-waist", value: "36", label: "36 Inches", sortOrder: 5 },
      { id: "val-waist-38", attributeId: "attr-waist", value: "38", label: "38 Inches", sortOrder: 6 },
    ],
  },
  {
    id: "attr-length",
    code: "length",
    name: "Inseam Length",
    type: "select",
    displayOrder: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
    values: [
      { id: "val-len-30", attributeId: "attr-length", value: "30", label: "30 Inches (Short)", sortOrder: 1 },
      { id: "val-len-32", attributeId: "attr-length", value: "32", label: "32 Inches (Regular)", sortOrder: 2 },
      { id: "val-len-34", attributeId: "attr-length", value: "34", label: "34 Inches (Long)", sortOrder: 3 },
    ],
  },
  {
    id: "attr-material",
    code: "material",
    name: "Material",
    type: "select",
    displayOrder: 6,
    createdAt: "2026-01-01T00:00:00.000Z",
    values: [
      { id: "val-mat-calfskin", attributeId: "attr-material", value: "calfskin", label: "French Box Calfskin", sortOrder: 1 },
      { id: "val-mat-suede", attributeId: "attr-material", value: "suede", label: "Waterproof Reverse Suede", sortOrder: 2 },
      { id: "val-mat-wool", attributeId: "attr-material", value: "merino_wool", label: "100% Extrafine Merino Wool", sortOrder: 3 },
      { id: "val-mat-cashmere", attributeId: "attr-material", value: "cashmere", label: "Cashmere Blend", sortOrder: 4 },
      { id: "val-mat-bridle", attributeId: "attr-material", value: "bridle_leather", label: "English Bridle Leather", sortOrder: 5 },
    ],
  },
];

// Initial product attribute assignments for seed products
export const INITIAL_PRODUCT_ATTRIBUTES: Record<string, string[]> = {
  "prod-oxford-001": ["attr-size", "attr-color"],
  "prod-boot-002": ["attr-size", "attr-color"],
  "prod-sneaker-003": ["attr-size", "attr-color"],
  "prod-loafer-004": ["attr-size", "attr-color"],
  "prod-knitwear-005": ["attr-size", "attr-color"],
  "prod-coat-006": ["attr-size", "attr-color", "attr-fit"],
  "prod-belt-007": ["attr-size", "attr-color"],
  "prod-brogue-008": ["attr-size", "attr-color"],
};

// Global memory stores for development
declare global {
  // eslint-disable-next-line no-var
  var _memoryAttributesStore: Map<string, Attribute> | undefined;
  // eslint-disable-next-line no-var
  var _memoryAttributeValuesStore: Map<string, AttributeValue> | undefined;
  // eslint-disable-next-line no-var
  var _memoryProductAttributesStore: Map<string, string[]> | undefined;
}

function initMemoryAttributes(): Map<string, Attribute> {
  const map = new Map<string, Attribute>();
  for (const a of SEED_ATTRIBUTES) {
    map.set(a.id, { ...a, values: [...(a.values || [])] });
  }
  return map;
}

function initMemoryAttributeValues(): Map<string, AttributeValue> {
  const map = new Map<string, AttributeValue>();
  for (const a of SEED_ATTRIBUTES) {
    for (const v of a.values || []) {
      map.set(v.id, { ...v });
    }
  }
  return map;
}

function initMemoryProductAttributes(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [prodId, attrIds] of Object.entries(INITIAL_PRODUCT_ATTRIBUTES)) {
    map.set(prodId, [...attrIds]);
  }
  return map;
}

const memoryAttributes =
  global._memoryAttributesStore ||
  (global._memoryAttributesStore = initMemoryAttributes());

const memoryAttributeValues =
  global._memoryAttributeValuesStore ||
  (global._memoryAttributeValuesStore = initMemoryAttributeValues());

const memoryProductAttributes =
  global._memoryProductAttributesStore ||
  (global._memoryProductAttributesStore = initMemoryProductAttributes());

// =============================================================================
// ATTRIBUTE SERVICE
// =============================================================================

export const attributeService = {
  /**
   * Retrieves all available attributes with their associated values
   */
  async listAttributes(): Promise<Attribute[]> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const attrRows = await db
          .select()
          .from(attributesTable)
          .orderBy(asc(attributesTable.displayOrder), asc(attributesTable.name));

        const valRows = await db
          .select()
          .from(attributeValuesTable)
          .orderBy(asc(attributeValuesTable.sortOrder));

        return attrRows.map((a) => {
          const values: AttributeValue[] = valRows
            .filter((v) => v.attributeId === a.id)
            .map((v) => ({
              id: v.id,
              attributeId: v.attributeId,
              value: v.value,
              label: v.label,
              colorHex: v.colorHex,
              sortOrder: v.sortOrder,
              metadata: (v.metadata as Record<string, unknown>) || {},
              createdAt: v.createdAt.toISOString(),
            }));

          return {
            id: a.id,
            code: a.code,
            name: a.name,
            type: a.type as Attribute["type"],
            displayOrder: a.displayOrder,
            createdAt: a.createdAt.toISOString(),
            values,
          };
        });
      } catch (err) {
        console.warn("DB listAttributes failed, falling back to memory:", err);
      }
    }

    return Array.from(memoryAttributes.values()).map((attr) => {
      const values = Array.from(memoryAttributeValues.values())
        .filter((v) => v.attributeId === attr.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return { ...attr, values };
    }).sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * Finds an attribute by ID
   */
  async getAttributeById(id: string): Promise<Attribute | null> {
    const all = await this.listAttributes();
    return all.find((a) => a.id === id) || null;
  },

  /**
   * Finds an attribute by code slug (e.g. "size", "color")
   */
  async getAttributeByCode(code: string): Promise<Attribute | null> {
    const normalized = code.trim().toLowerCase();
    const all = await this.listAttributes();
    return all.find((a) => a.code.toLowerCase() === normalized) || null;
  },

  /**
   * Retrieves all attributes assigned to a specific product
   */
  async getProductAttributes(productId: string): Promise<Attribute[]> {
    let assignedAttributeIds: string[] = [];

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(productAttributesTable)
          .where(eq(productAttributesTable.productId, productId))
          .orderBy(asc(productAttributesTable.sortOrder));

        assignedAttributeIds = rows.map((r) => r.attributeId);
      } catch (err) {
        console.warn("DB getProductAttributes failed, using memory fallback:", err);
        assignedAttributeIds = memoryProductAttributes.get(productId) || [];
      }
    } else {
      assignedAttributeIds = memoryProductAttributes.get(productId) || [];
    }

    const allAttributes = await this.listAttributes();
    const idMap = new Map(allAttributes.map((a) => [a.id, a]));

    const result: Attribute[] = [];
    for (const attrId of assignedAttributeIds) {
      const attr = idMap.get(attrId);
      if (attr) {
        result.push(attr);
      }
    }
    return result;
  },

  /**
   * Sets/updates which attributes are enabled for a product
   */
  async setProductAttributes(
    productId: string,
    attributeIds: string[]
  ): Promise<Attribute[]> {
    // Unique clean array
    const cleanIds = Array.from(new Set(attributeIds.filter(Boolean)));

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        // Clear previous bindings
        await db
          .delete(productAttributesTable)
          .where(eq(productAttributesTable.productId, productId));

        // Insert new associations
        if (cleanIds.length > 0) {
          await db.insert(productAttributesTable).values(
            cleanIds.map((attrId, idx) => ({
              productId,
              attributeId: attrId,
              sortOrder: idx,
            }))
          );
        }
      } catch (err) {
        console.warn("DB setProductAttributes failed, saving in memory:", err);
      }
    }

    memoryProductAttributes.set(productId, cleanIds);
    return this.getProductAttributes(productId);
  },

  /**
   * Creates a new generic attribute definition
   */
  async createAttribute(input: CreateAttributeInput): Promise<Attribute> {
    const existing = await this.getAttributeByCode(input.code);
    if (existing) {
      throw new Error(`An attribute with code "${input.code}" already exists.`);
    }

    const id = `attr-${input.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
    const newAttr: Attribute = {
      id,
      code: input.code.toLowerCase().trim(),
      name: input.name.trim(),
      type: input.type,
      displayOrder: input.displayOrder,
      createdAt: new Date().toISOString(),
      values: [],
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const inserted = await db
          .insert(attributesTable)
          .values({
            code: newAttr.code,
            name: newAttr.name,
            type: newAttr.type,
            displayOrder: newAttr.displayOrder,
          })
          .returning();

        if (inserted[0]) {
          newAttr.id = inserted[0].id;
        }
      } catch (err) {
        console.warn("DB createAttribute failed, keeping in memory:", err);
      }
    }

    memoryAttributes.set(newAttr.id, newAttr);
    return newAttr;
  },

  /**
   * Creates a new attribute value for an existing attribute
   */
  async createAttributeValue(
    input: CreateAttributeValueInput
  ): Promise<AttributeValue> {
    const attr = await this.getAttributeById(input.attributeId);
    if (!attr) {
      throw new Error(`Attribute with ID "${input.attributeId}" not found.`);
    }

    // Check duplicate value for this attribute
    const existingVal = (attr.values || []).find(
      (v) => v.value.toLowerCase() === input.value.trim().toLowerCase()
    );
    if (existingVal) {
      throw new Error(
        `Attribute value "${input.value}" already exists for ${attr.name}.`
      );
    }

    const id = `val-${attr.code}-${input.value.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
    const newValue: AttributeValue = {
      id,
      attributeId: input.attributeId,
      value: input.value.trim(),
      label: input.label.trim(),
      colorHex: input.colorHex || null,
      sortOrder: input.sortOrder,
      metadata: {},
      createdAt: new Date().toISOString(),
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const inserted = await db
          .insert(attributeValuesTable)
          .values({
            attributeId: input.attributeId,
            value: newValue.value,
            label: newValue.label,
            colorHex: newValue.colorHex,
            sortOrder: newValue.sortOrder,
          })
          .returning();

        if (inserted[0]) {
          newValue.id = inserted[0].id;
        }
      } catch (err) {
        console.warn("DB createAttributeValue failed, keeping in memory:", err);
      }
    }

    memoryAttributeValues.set(newValue.id, newValue);

    // Update parent attribute values list in memory
    const existingAttr = memoryAttributes.get(input.attributeId);
    if (existingAttr) {
      existingAttr.values = [...(existingAttr.values || []), newValue];
    }

    return newValue;
  },
};
