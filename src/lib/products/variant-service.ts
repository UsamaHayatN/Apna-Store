import { eq, desc, asc, and, or, sql, isNull, isNotNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import {
  products as productsTable,
  productVariants as variantsTable,
  variantAttributeValues as variantAttrValsTable,
  productMedia as productMediaTable,
  inventoryLevels as inventoryLevelsTable,
} from "@/lib/db/schema";
import { ProductVariant, ProductMedia, VariantAttributeValueSelection } from "@/types";
import {
  CreateVariantInput,
  UpdateVariantInput,
  GenerateVariantsInput,
} from "@/lib/validation/variant";
import { attributeService } from "./attribute-service";
import { recordAuditLog } from "@/lib/audit";

// =============================================================================
// UTILITIES: Deterministic Combination Hash & SKU Normalization
// =============================================================================

import {
  buildCombinationHash,
  normalizeSku,
  getEffectiveVariantPrice,
} from "./variant-utils";

export {
  buildCombinationHash,
  normalizeSku,
  getEffectiveVariantPrice,
};

// =============================================================================
// SEED VARIANTS
// =============================================================================

export const INITIAL_VARIANTS: ProductVariant[] = [
  // The Heritage Cap-Toe Oxford
  {
    id: "var-oxf-01",
    productId: "prod-oxford-001",
    sku: "OXF-COG-40",
    barcode: "840001001",
    combinationHash: "color:cognac|size:40",
    title: "Cognac Brown / EU 40",
    priceOverride: null, // inherits basePrice: 295.00
    compareAtPrice: 350.0,
    costPrice: 110.0,
    weightGrams: 950,
    isActive: true,
    attributes: { color: "cognac", size: "40" },
    images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 12,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
  },
  {
    id: "var-oxf-02",
    productId: "prod-oxford-001",
    sku: "OXF-COG-41",
    barcode: "840001002",
    combinationHash: "color:cognac|size:41",
    title: "Cognac Brown / EU 41",
    priceOverride: null,
    compareAtPrice: 350.0,
    costPrice: 110.0,
    weightGrams: 960,
    isActive: true,
    attributes: { color: "cognac", size: "41" },
    images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 18,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
  },
  {
    id: "var-oxf-03",
    productId: "prod-oxford-001",
    sku: "OXF-COG-42",
    barcode: "840001003",
    combinationHash: "color:cognac|size:42",
    title: "Cognac Brown / EU 42",
    priceOverride: null,
    compareAtPrice: 350.0,
    costPrice: 110.0,
    weightGrams: 980,
    isActive: true,
    attributes: { color: "cognac", size: "42" },
    images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 15,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
  },
  {
    id: "var-oxf-04",
    productId: "prod-oxford-001",
    sku: "OXF-COG-43",
    barcode: "840001004",
    combinationHash: "color:cognac|size:43",
    title: "Cognac Brown / EU 43",
    priceOverride: 315.0, // Special large-size override
    compareAtPrice: 365.0,
    costPrice: 115.0,
    weightGrams: 1000,
    isActive: true,
    attributes: { color: "cognac", size: "43" },
    images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 10,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
  },
  // Goodyear-Welted Chelsea Boot
  {
    id: "var-boot-01",
    productId: "prod-boot-002",
    sku: "BOOT-ESP-41",
    barcode: "840002001",
    combinationHash: "color:espresso|size:41",
    title: "Espresso Brown / EU 41",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 145.0,
    weightGrams: 1150,
    isActive: true,
    attributes: { color: "espresso", size: "41" },
    images: ["https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 20,
    createdAt: "2026-01-12T14:30:00.000Z",
    updatedAt: "2026-01-18T09:15:00.000Z",
  },
  {
    id: "var-boot-02",
    productId: "prod-boot-002",
    sku: "BOOT-ESP-42",
    barcode: "840002002",
    combinationHash: "color:espresso|size:42",
    title: "Espresso Brown / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 145.0,
    weightGrams: 1170,
    isActive: true,
    attributes: { color: "espresso", size: "42" },
    images: ["https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 22,
    createdAt: "2026-01-12T14:30:00.000Z",
    updatedAt: "2026-01-18T09:15:00.000Z",
  },
  {
    id: "var-boot-03",
    productId: "prod-boot-002",
    sku: "BOOT-BLK-41",
    barcode: "840002003",
    combinationHash: "color:black|size:41",
    title: "Onyx Black / EU 41",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 145.0,
    weightGrams: 1150,
    isActive: true,
    attributes: { color: "black", size: "41" },
    images: ["https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 12,
    createdAt: "2026-01-12T14:30:00.000Z",
    updatedAt: "2026-01-18T09:15:00.000Z",
  },
  {
    id: "var-boot-04",
    productId: "prod-boot-002",
    sku: "BOOT-BLK-42",
    barcode: "840002004",
    combinationHash: "color:black|size:42",
    title: "Onyx Black / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 145.0,
    weightGrams: 1170,
    isActive: true,
    attributes: { color: "black", size: "42" },
    images: ["https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 10,
    createdAt: "2026-01-12T14:30:00.000Z",
    updatedAt: "2026-01-18T09:15:00.000Z",
  },
  // Minimalist Calfskin Court Sneaker
  {
    id: "var-snk-01",
    productId: "prod-sneaker-003",
    sku: "SNK-WHT-41",
    barcode: "840003001",
    combinationHash: "color:white|size:41",
    title: "Pristine White / EU 41",
    priceOverride: null,
    compareAtPrice: 310.0,
    costPrice: 95.0,
    weightGrams: 750,
    isActive: true,
    attributes: { color: "white", size: "41" },
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 25,
    createdAt: "2026-01-15T11:00:00.000Z",
    updatedAt: "2026-01-20T16:45:00.000Z",
  },
  {
    id: "var-snk-02",
    productId: "prod-sneaker-003",
    sku: "SNK-WHT-42",
    barcode: "840003002",
    combinationHash: "color:white|size:42",
    title: "Pristine White / EU 42",
    priceOverride: null,
    compareAtPrice: 310.0,
    costPrice: 95.0,
    weightGrams: 760,
    isActive: true,
    attributes: { color: "white", size: "42" },
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 30,
    createdAt: "2026-01-15T11:00:00.000Z",
    updatedAt: "2026-01-20T16:45:00.000Z",
  },
  {
    id: "var-snk-03",
    productId: "prod-sneaker-003",
    sku: "SNK-BLK-41",
    barcode: "840003003",
    combinationHash: "color:black|size:41",
    title: "Onyx Black / EU 41",
    priceOverride: null,
    compareAtPrice: 310.0,
    costPrice: 95.0,
    weightGrams: 750,
    isActive: true,
    attributes: { color: "black", size: "41" },
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 15,
    createdAt: "2026-01-15T11:00:00.000Z",
    updatedAt: "2026-01-20T16:45:00.000Z",
  },
  {
    id: "var-snk-04",
    productId: "prod-sneaker-003",
    sku: "SNK-BLK-42",
    barcode: "840003004",
    combinationHash: "color:black|size:42",
    title: "Onyx Black / EU 42",
    priceOverride: null,
    compareAtPrice: 310.0,
    costPrice: 95.0,
    weightGrams: 760,
    isActive: true,
    attributes: { color: "black", size: "42" },
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 12,
    createdAt: "2026-01-15T11:00:00.000Z",
    updatedAt: "2026-01-20T16:45:00.000Z",
  },
  // Merino Wool Cashmere Rollneck (Apparel)
  {
    id: "var-knt-01",
    productId: "prod-knitwear-005",
    sku: "KNT-CHA-S",
    barcode: "840005001",
    combinationHash: "color:charcoal|size:s",
    title: "Charcoal Grey / S",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 75.0,
    weightGrams: 420,
    isActive: true,
    attributes: { color: "charcoal", size: "S" },
    images: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 8,
    createdAt: "2026-01-20T15:00:00.000Z",
    updatedAt: "2026-01-25T11:30:00.000Z",
  },
  {
    id: "var-knt-02",
    productId: "prod-knitwear-005",
    sku: "KNT-CHA-M",
    barcode: "840005002",
    combinationHash: "color:charcoal|size:m",
    title: "Charcoal Grey / M",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 75.0,
    weightGrams: 440,
    isActive: true,
    attributes: { color: "charcoal", size: "M" },
    images: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 12,
    createdAt: "2026-01-20T15:00:00.000Z",
    updatedAt: "2026-01-25T11:30:00.000Z",
  },
  {
    id: "var-knt-03",
    productId: "prod-knitwear-005",
    sku: "KNT-NAV-M",
    barcode: "840005003",
    combinationHash: "color:navy|size:m",
    title: "Midnight Navy / M",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 75.0,
    weightGrams: 440,
    isActive: true,
    attributes: { color: "navy", size: "M" },
    images: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 10,
    createdAt: "2026-01-20T15:00:00.000Z",
    updatedAt: "2026-01-25T11:30:00.000Z",
  },
  // Double-Breasted Cashmere Blend Overcoat (Apparel with 3 attributes: Color, Size, Fit)
  {
    id: "var-coat-01",
    productId: "prod-coat-006",
    sku: "OUT-NAV-SLM-M",
    barcode: "840006001",
    combinationHash: "color:navy|fit:slim|size:m",
    title: "Midnight Navy / Slim Fit / M",
    priceOverride: null,
    compareAtPrice: 750.0,
    costPrice: 260.0,
    weightGrams: 1650,
    isActive: true,
    attributes: { color: "navy", fit: "slim", size: "M" },
    images: ["https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 6,
    createdAt: "2026-01-22T09:30:00.000Z",
    updatedAt: "2026-01-28T14:10:00.000Z",
  },
  {
    id: "var-coat-02",
    productId: "prod-coat-006",
    sku: "OUT-NAV-REG-L",
    barcode: "840006002",
    combinationHash: "color:navy|fit:regular|size:l",
    title: "Midnight Navy / Regular Fit / L",
    priceOverride: null,
    compareAtPrice: 750.0,
    costPrice: 260.0,
    weightGrams: 1700,
    isActive: true,
    attributes: { color: "navy", fit: "regular", size: "L" },
    images: ["https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 8,
    createdAt: "2026-01-22T09:30:00.000Z",
    updatedAt: "2026-01-28T14:10:00.000Z",
  },
  // English Bridle Leather Dress Belt (Accessories)
  {
    id: "var-belt-01",
    productId: "prod-belt-007",
    sku: "BLT-COG-32",
    barcode: "840007001",
    combinationHash: "color:cognac|size:32",
    title: "Cognac Brown / 32",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 40.0,
    weightGrams: 280,
    isActive: true,
    attributes: { color: "cognac", size: "32" },
    images: ["https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 25,
    createdAt: "2026-01-24T12:00:00.000Z",
    updatedAt: "2026-01-29T16:00:00.000Z",
  },
  {
    id: "var-belt-02",
    productId: "prod-belt-007",
    sku: "BLT-COG-34",
    barcode: "840007002",
    combinationHash: "color:cognac|size:34",
    title: "Cognac Brown / 34",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 40.0,
    weightGrams: 290,
    isActive: true,
    attributes: { color: "cognac", size: "34" },
    images: ["https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 30,
    createdAt: "2026-01-24T12:00:00.000Z",
    updatedAt: "2026-01-29T16:00:00.000Z",
  },
  {
    id: "var-belt-03",
    productId: "prod-belt-007",
    sku: "BLT-BLK-32",
    barcode: "840007003",
    combinationHash: "color:black|size:32",
    title: "Onyx Black / 32",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 40.0,
    weightGrams: 280,
    isActive: true,
    attributes: { color: "black", size: "32" },
    images: ["https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 20,
    createdAt: "2026-01-24T12:00:00.000Z",
    updatedAt: "2026-01-29T16:00:00.000Z",
  },
  // Horween Chromexcel Service Boot
  {
    id: "var-srv-01",
    productId: "prod-boot-008",
    sku: "SRV-COG-41",
    barcode: "840008001",
    combinationHash: "color:cognac|size:41",
    title: "Cognac Brown / EU 41",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 155.0,
    weightGrams: 1300,
    isActive: true,
    attributes: { color: "cognac", size: "41" },
    images: ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 12,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
  },
  {
    id: "var-srv-02",
    productId: "prod-boot-008",
    sku: "SRV-COG-42",
    barcode: "840008002",
    combinationHash: "color:cognac|size:42",
    title: "Cognac Brown / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 155.0,
    weightGrams: 1320,
    isActive: true,
    attributes: { color: "cognac", size: "42" },
    images: ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 15,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
  },
  {
    id: "var-srv-03",
    productId: "prod-boot-008",
    sku: "SRV-BLK-42",
    barcode: "840008003",
    combinationHash: "color:black|size:42",
    title: "Onyx Black / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 155.0,
    weightGrams: 1320,
    isActive: true,
    attributes: { color: "black", size: "42" },
    images: ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 8,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
  },
  {
    id: "var-srv-04",
    productId: "prod-boot-008",
    sku: "SRV-BLK-43",
    barcode: "840008004",
    combinationHash: "color:black|size:43",
    title: "Onyx Black / EU 43",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 155.0,
    weightGrams: 1350,
    isActive: true,
    attributes: { color: "black", size: "43" },
    images: ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 10,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
  },
  // Vintage Retro Runner 77
  {
    id: "var-retro-01",
    productId: "prod-snk-009",
    sku: "RET-WHT-41",
    barcode: "840009001",
    combinationHash: "color:white|size:41",
    title: "Off-White & Suede / EU 41",
    priceOverride: null,
    compareAtPrice: 220.0,
    costPrice: 65.0,
    weightGrams: 680,
    isActive: true,
    attributes: { color: "white", size: "41" },
    images: ["https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 20,
    createdAt: "2026-01-11T12:00:00.000Z",
    updatedAt: "2026-01-22T14:00:00.000Z",
  },
  {
    id: "var-retro-02",
    productId: "prod-snk-009",
    sku: "RET-WHT-42",
    barcode: "840009002",
    combinationHash: "color:white|size:42",
    title: "Off-White & Suede / EU 42",
    priceOverride: null,
    compareAtPrice: 220.0,
    costPrice: 65.0,
    weightGrams: 700,
    isActive: true,
    attributes: { color: "white", size: "42" },
    images: ["https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 25,
    createdAt: "2026-01-11T12:00:00.000Z",
    updatedAt: "2026-01-22T14:00:00.000Z",
  },
  {
    id: "var-retro-03",
    productId: "prod-snk-009",
    sku: "RET-NVY-43",
    barcode: "840009003",
    combinationHash: "color:navy|size:43",
    title: "Vintage Navy / EU 43",
    priceOverride: null,
    compareAtPrice: 220.0,
    costPrice: 65.0,
    weightGrams: 720,
    isActive: true,
    attributes: { color: "navy", size: "43" },
    images: ["https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 15,
    createdAt: "2026-01-11T12:00:00.000Z",
    updatedAt: "2026-01-22T14:00:00.000Z",
  },
  // Museum Calf Wholecut Oxford
  {
    id: "var-whl-01",
    productId: "prod-dress-010",
    sku: "WHL-ESP-42",
    barcode: "840010001",
    combinationHash: "color:espresso|size:42",
    title: "Museum Espresso / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 175.0,
    weightGrams: 950,
    isActive: true,
    attributes: { color: "espresso", size: "42" },
    images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 14,
    createdAt: "2026-01-12T09:00:00.000Z",
    updatedAt: "2026-01-25T11:00:00.000Z",
  },
  {
    id: "var-whl-02",
    productId: "prod-dress-010",
    sku: "WHL-ESP-43",
    barcode: "840010002",
    combinationHash: "color:espresso|size:43",
    title: "Museum Espresso / EU 43",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 175.0,
    weightGrams: 970,
    isActive: true,
    attributes: { color: "espresso", size: "43" },
    images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 16,
    createdAt: "2026-01-12T09:00:00.000Z",
    updatedAt: "2026-01-25T11:00:00.000Z",
  },
  // Belgian Loafer in Snuff Suede
  {
    id: "var-bel-01",
    productId: "prod-lfr-011",
    sku: "BEL-SNF-41",
    barcode: "840011001",
    combinationHash: "color:cognac|size:41",
    title: "Snuff Suede / EU 41",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 95.0,
    weightGrams: 650,
    isActive: true,
    attributes: { color: "cognac", size: "41" },
    images: ["https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 18,
    createdAt: "2026-01-13T10:00:00.000Z",
    updatedAt: "2026-01-26T15:00:00.000Z",
  },
  {
    id: "var-bel-02",
    productId: "prod-lfr-011",
    sku: "BEL-SNF-42",
    barcode: "840011002",
    combinationHash: "color:cognac|size:42",
    title: "Snuff Suede / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 95.0,
    weightGrams: 670,
    isActive: true,
    attributes: { color: "cognac", size: "42" },
    images: ["https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 22,
    createdAt: "2026-01-13T10:00:00.000Z",
    updatedAt: "2026-01-26T15:00:00.000Z",
  },
  // Handmade Kudu Suede Chukka Boot
  {
    id: "var-chk-01",
    productId: "prod-boot-012",
    sku: "CHK-KUD-42",
    barcode: "840012001",
    combinationHash: "color:cognac|size:42",
    title: "Kudu Rust / EU 42",
    priceOverride: null,
    compareAtPrice: 390.0,
    costPrice: 125.0,
    weightGrams: 1100,
    isActive: true,
    attributes: { color: "cognac", size: "42" },
    images: ["https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 15,
    createdAt: "2026-01-14T11:00:00.000Z",
    updatedAt: "2026-01-27T16:00:00.000Z",
  },
  // Supple Deerskin Driving Moccasin
  {
    id: "var-drv-01",
    productId: "prod-casual-013",
    sku: "DRV-BLK-42",
    barcode: "840013001",
    combinationHash: "color:black|size:42",
    title: "Onyx Black / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 85.0,
    weightGrams: 620,
    isActive: true,
    attributes: { color: "black", size: "42" },
    images: ["https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 18,
    createdAt: "2026-01-15T12:00:00.000Z",
    updatedAt: "2026-01-28T17:00:00.000Z",
  },
  {
    id: "var-drv-02",
    productId: "prod-casual-013",
    sku: "DRV-COG-43",
    barcode: "840013002",
    combinationHash: "color:cognac|size:43",
    title: "Cognac Brown / EU 43",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 85.0,
    weightGrams: 640,
    isActive: true,
    attributes: { color: "cognac", size: "43" },
    images: ["https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 17,
    createdAt: "2026-01-15T12:00:00.000Z",
    updatedAt: "2026-01-28T17:00:00.000Z",
  },
  // Heavyweight Waxed Canvas Slip-On
  {
    id: "var-slp-01",
    productId: "prod-casual-014",
    sku: "SLP-OLV-42",
    barcode: "840014001",
    combinationHash: "color:olive|size:42",
    title: "Field Olive / EU 42",
    priceOverride: null,
    compareAtPrice: 175.0,
    costPrice: 48.0,
    weightGrams: 750,
    isActive: true,
    attributes: { color: "olive", size: "42" },
    images: ["https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 25,
    createdAt: "2026-01-16T13:00:00.000Z",
    updatedAt: "2026-01-29T10:00:00.000Z",
  },
  // AeroStride Carbon Trail Runner
  {
    id: "var-trl-01",
    productId: "prod-sports-015",
    sku: "TRL-BLK-42",
    barcode: "840015001",
    combinationHash: "color:black|size:42",
    title: "Carbon Stealth / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 72.0,
    weightGrams: 620,
    isActive: true,
    attributes: { color: "black", size: "42" },
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 28,
    createdAt: "2026-01-17T08:00:00.000Z",
    updatedAt: "2026-01-30T09:00:00.000Z",
  },
  {
    id: "var-trl-02",
    productId: "prod-sports-015",
    sku: "TRL-BLK-43",
    barcode: "840015002",
    combinationHash: "color:black|size:43",
    title: "Carbon Stealth / EU 43",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 72.0,
    weightGrams: 640,
    isActive: true,
    attributes: { color: "black", size: "43" },
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 27,
    createdAt: "2026-01-17T08:00:00.000Z",
    updatedAt: "2026-01-30T09:00:00.000Z",
  },
  // Tuscan Vachetta Leather Slide
  {
    id: "var-sld-01",
    productId: "prod-sandal-017",
    sku: "SLD-COG-42",
    barcode: "840017001",
    combinationHash: "color:cognac|size:42",
    title: "Natural Vachetta / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 62.0,
    weightGrams: 480,
    isActive: true,
    attributes: { color: "cognac", size: "42" },
    images: ["https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 18,
    createdAt: "2026-01-19T11:00:00.000Z",
    updatedAt: "2026-01-31T14:00:00.000Z",
  },
  {
    id: "var-sld-02",
    productId: "prod-sandal-017",
    sku: "SLD-BLK-42",
    barcode: "840017002",
    combinationHash: "color:black|size:42",
    title: "Onyx Black / EU 42",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 62.0,
    weightGrams: 480,
    isActive: true,
    attributes: { color: "black", size: "42" },
    images: ["https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 20,
    createdAt: "2026-01-19T11:00:00.000Z",
    updatedAt: "2026-01-31T14:00:00.000Z",
  },
  // Double Monk Strap in Parisian Museum Calf
  {
    id: "var-mnk-01",
    productId: "prod-dress-020",
    sku: "MNK-BUR-42",
    barcode: "840020001",
    combinationHash: "color:burgundy|size:42",
    title: "Parisian Burgundy / EU 42",
    priceOverride: null,
    compareAtPrice: 420.0,
    costPrice: 140.0,
    weightGrams: 980,
    isActive: true,
    attributes: { color: "burgundy", size: "42" },
    images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 11,
    createdAt: "2026-01-22T15:00:00.000Z",
    updatedAt: "2026-02-03T17:00:00.000Z",
  },
  {
    id: "var-mnk-02",
    productId: "prod-dress-020",
    sku: "MNK-BUR-43",
    barcode: "840020002",
    combinationHash: "color:burgundy|size:43",
    title: "Parisian Burgundy / EU 43",
    priceOverride: null,
    compareAtPrice: 420.0,
    costPrice: 140.0,
    weightGrams: 1000,
    isActive: true,
    attributes: { color: "burgundy", size: "43" },
    images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 11,
    createdAt: "2026-01-22T15:00:00.000Z",
    updatedAt: "2026-02-03T17:00:00.000Z",
  },
  // High-Top Padded Leather Basketball Sneaker
  {
    id: "var-hgt-01",
    productId: "prod-snk-021",
    sku: "HGT-WHT-42",
    barcode: "840021001",
    combinationHash: "color:white|size:42",
    title: "Optic White / EU 42",
    priceOverride: null,
    compareAtPrice: 275.0,
    costPrice: 85.0,
    weightGrams: 900,
    isActive: true,
    attributes: { color: "white", size: "42" },
    images: ["https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 18,
    createdAt: "2026-01-23T16:00:00.000Z",
    updatedAt: "2026-02-04T18:00:00.000Z",
  },
  {
    id: "var-hgt-02",
    productId: "prod-snk-021",
    sku: "HGT-BLK-42",
    barcode: "840021002",
    combinationHash: "color:black|size:42",
    title: "Onyx Black / EU 42",
    priceOverride: null,
    compareAtPrice: 275.0,
    costPrice: 85.0,
    weightGrams: 900,
    isActive: true,
    attributes: { color: "black", size: "42" },
    images: ["https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 18,
    createdAt: "2026-01-23T16:00:00.000Z",
    updatedAt: "2026-02-04T18:00:00.000Z",
  },
  // Selvedge Raw Denim Jean
  {
    id: "var-dnm-01",
    productId: "prod-apparel-024",
    sku: "DNM-IND-32",
    barcode: "840024001",
    combinationHash: "color:navy|size:32",
    title: "Raw Indigo / 32",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 75.0,
    weightGrams: 850,
    isActive: true,
    attributes: { color: "navy", size: "32" },
    images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 20,
    createdAt: "2026-01-26T12:00:00.000Z",
    updatedAt: "2026-02-07T14:00:00.000Z",
  },
  {
    id: "var-dnm-02",
    productId: "prod-apparel-024",
    sku: "DNM-IND-34",
    barcode: "840024002",
    combinationHash: "color:navy|size:34",
    title: "Raw Indigo / 34",
    priceOverride: null,
    compareAtPrice: null,
    costPrice: 75.0,
    weightGrams: 880,
    isActive: true,
    attributes: { color: "navy", size: "34" },
    images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 20,
    createdAt: "2026-01-26T12:00:00.000Z",
    updatedAt: "2026-02-07T14:00:00.000Z",
  },
  // Fine Cotton Oxford Button-Down Shirt
  {
    id: "var-sht-01",
    productId: "prod-apparel-025",
    sku: "SHT-WHT-M",
    barcode: "840025001",
    combinationHash: "color:white|size:m",
    title: "Optic White / M",
    priceOverride: null,
    compareAtPrice: 165.0,
    costPrice: 48.0,
    weightGrams: 350,
    isActive: true,
    attributes: { color: "white", size: "M" },
    images: ["https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 25,
    createdAt: "2026-01-27T13:00:00.000Z",
    updatedAt: "2026-02-08T15:00:00.000Z",
  },
  {
    id: "var-sht-02",
    productId: "prod-apparel-025",
    sku: "SHT-BLU-L",
    barcode: "840025002",
    combinationHash: "color:navy|size:l",
    title: "Chambray Blue / L",
    priceOverride: null,
    compareAtPrice: 165.0,
    costPrice: 48.0,
    weightGrams: 360,
    isActive: true,
    attributes: { color: "navy", size: "L" },
    images: ["https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=800&q=80"],
    stockQuantity: 25,
    createdAt: "2026-01-27T13:00:00.000Z",
    updatedAt: "2026-02-08T15:00:00.000Z",
  },
];

declare global {
  // eslint-disable-next-line no-var
  var _memoryVariantsStore: Map<string, ProductVariant> | undefined;
}

const memoryVariants: Map<string, ProductVariant> =
  global._memoryVariantsStore ||
  (global._memoryVariantsStore = new Map(
    INITIAL_VARIANTS.map((v) => [v.id, { ...v }])
  ));

// =============================================================================
// VARIANT SERVICE
// =============================================================================

export const variantService = {
  /**
   * Checks whether a SKU is globally unique (case-insensitive).
   * Returns true if available.
   */
  async isSkuUnique(sku: string, excludeVariantId?: string): Promise<boolean> {
    const normalized = normalizeSku(sku);

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const existing = await db
          .select({ id: variantsTable.id })
          .from(variantsTable)
          .where(sql`upper(${variantsTable.sku}) = ${normalized}`)
          .limit(1);

        if (existing.length > 0) {
          if (excludeVariantId && existing[0].id === excludeVariantId) {
            return true;
          }
          return false;
        }
        return true;
      } catch (err) {
        console.warn("DB isSkuUnique failed, checking memory:", err);
      }
    }

    for (const v of memoryVariants.values()) {
      if (normalizeSku(v.sku) === normalized) {
        if (excludeVariantId && v.id === excludeVariantId) {
          continue;
        }
        return false;
      }
    }
    return true;
  },

  /**
   * Checks whether an attribute combination is unique within a product.
   * Returns true if available.
   */
  async isCombinationUnique(
    productId: string,
    combinationHash: string,
    excludeVariantId?: string
  ): Promise<boolean> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const existing = await db
          .select({ id: variantsTable.id })
          .from(variantsTable)
          .where(
            and(
              eq(variantsTable.productId, productId),
              eq(variantsTable.combinationHash, combinationHash),
              isNull(variantsTable.deletedAt)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          if (excludeVariantId && existing[0].id === excludeVariantId) {
            return true;
          }
          return false;
        }
        return true;
      } catch (err) {
        console.warn("DB isCombinationUnique failed, checking memory:", err);
      }
    }

    for (const v of memoryVariants.values()) {
      if (
        v.productId === productId &&
        v.combinationHash === combinationHash &&
        !v.deletedAt
      ) {
        if (excludeVariantId && v.id === excludeVariantId) {
          continue;
        }
        return false;
      }
    }
    return true;
  },

  /**
   * Retrieves all variants for a product
   */
  async listVariantsByProductId(
    productId: string,
    options?: { includeArchived?: boolean }
  ): Promise<ProductVariant[]> {
    const includeArchived = options?.includeArchived ?? false;

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const conditions = [eq(variantsTable.productId, productId)];
        if (!includeArchived) {
          conditions.push(isNull(variantsTable.deletedAt));
        }

        const rows = await db
          .select()
          .from(variantsTable)
          .where(and(...conditions))
          .orderBy(asc(variantsTable.createdAt));

        // Fetch media for these variants
        const variantIds = rows.map((r) => r.id);
        const mediaRows =
          variantIds.length > 0
            ? await db
                .select()
                .from(productMediaTable)
                .where(sql`${productMediaTable.variantId} IN ${variantIds}`)
                .orderBy(asc(productMediaTable.sortOrder))
            : [];

        // Fetch inventory levels
        const invRows =
          variantIds.length > 0
            ? await db
                .select()
                .from(inventoryLevelsTable)
                .where(sql`${inventoryLevelsTable.variantId} IN ${variantIds}`)
            : [];
        const invMap = new Map(invRows.map((i) => [i.variantId, i]));

        return rows.map((r) => {
          const vMedia = mediaRows.filter((m) => m.variantId === r.id);
          const inv = invMap.get(r.id);

          return {
            id: r.id,
            productId: r.productId,
            sku: r.sku,
            barcode: r.barcode,
            combinationHash: r.combinationHash,
            title: r.title,
            priceOverride: r.priceOverride ? parseFloat(r.priceOverride) : null,
            compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice) : null,
            costPrice: r.costPrice ? parseFloat(r.costPrice) : null,
            weightGrams: r.weightGrams,
            isActive: r.isActive,
            attributes: r.attributesSummary,
            images: vMedia.map((m) => m.url),
            media: vMedia.map((m) => ({
              id: m.id,
              productId: m.productId,
              variantId: m.variantId,
              url: m.url,
              storageKey: m.storageKey,
              altText: m.altText,
              mimeType: m.mimeType,
              sortOrder: m.sortOrder,
              isPrimary: m.isPrimary,
              createdAt: m.createdAt.toISOString(),
            })),
            deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            stockQuantity: inv ? inv.stockQuantity : undefined,
            reservedQuantity: inv ? inv.reservedQuantity : undefined,
            availableQuantity: inv ? Math.max(0, inv.stockQuantity - inv.reservedQuantity) : undefined,
          };
        });
      } catch (err) {
        console.warn("DB listVariantsByProductId failed, using memory:", err);
      }
    }

    return Array.from(memoryVariants.values())
      .filter((v) => {
        if (v.productId !== productId) return false;
        if (!includeArchived && v.deletedAt) return false;
        return true;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  /**
   * Retrieves single variant by ID
   */
  async getVariantById(id: string): Promise<ProductVariant | null> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(variantsTable)
          .where(eq(variantsTable.id, id))
          .limit(1);

        if (rows.length === 0) return null;
        const r = rows[0];

        const mediaRows = await db
          .select()
          .from(productMediaTable)
          .where(eq(productMediaTable.variantId, id))
          .orderBy(asc(productMediaTable.sortOrder));

        const invRows = await db
          .select()
          .from(inventoryLevelsTable)
          .where(eq(inventoryLevelsTable.variantId, id))
          .limit(1);
        const inv = invRows[0];

        return {
          id: r.id,
          productId: r.productId,
          sku: r.sku,
          barcode: r.barcode,
          combinationHash: r.combinationHash,
          title: r.title,
          priceOverride: r.priceOverride ? parseFloat(r.priceOverride) : null,
          compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice) : null,
          costPrice: r.costPrice ? parseFloat(r.costPrice) : null,
          weightGrams: r.weightGrams,
          isActive: r.isActive,
          attributes: r.attributesSummary,
          images: mediaRows.map((m) => m.url),
          media: mediaRows.map((m) => ({
            id: m.id,
            productId: m.productId,
            variantId: m.variantId,
            url: m.url,
            storageKey: m.storageKey,
            altText: m.altText,
            mimeType: m.mimeType,
            sortOrder: m.sortOrder,
            isPrimary: m.isPrimary,
            createdAt: m.createdAt.toISOString(),
          })),
          deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          stockQuantity: inv ? inv.stockQuantity : undefined,
          reservedQuantity: inv ? inv.reservedQuantity : undefined,
          availableQuantity: inv ? Math.max(0, inv.stockQuantity - inv.reservedQuantity) : undefined,
        };
      } catch (err) {
        console.warn("DB getVariantById failed, using memory:", err);
      }
    }

    const v = memoryVariants.get(id);
    return v ? { ...v } : null;
  },

  /**
   * Validates that all attribute values passed in are valid and belong to the product's assigned attributes
   */
  async validateAttributesForProduct(
    productId: string,
    attributesInput: Record<string, string>
  ): Promise<{
    isValid: boolean;
    error?: string;
    selections: VariantAttributeValueSelection[];
  }> {
    const assignedAttributes = await attributeService.getProductAttributes(productId);

    if (assignedAttributes.length === 0) {
      // Product currently has no attributes assigned, but user is trying to add attributes.
      // Auto-assign any attributes whose codes match the input
      const allAttrs = await attributeService.listAttributes();
      const matching = allAttrs.filter((a) => attributesInput[a.code]);
      if (matching.length > 0) {
        await attributeService.setProductAttributes(productId, matching.map((m) => m.id));
        return this.validateAttributesForProduct(productId, attributesInput);
      }
    }

    const selections: VariantAttributeValueSelection[] = [];
    const inputKeys = Object.keys(attributesInput);

    // Check each key in input
    for (const key of inputKeys) {
      const code = key.toLowerCase().trim();
      const valStr = String(attributesInput[key]).toLowerCase().trim();

      const matchedAttr = assignedAttributes.find(
        (a) => a.code.toLowerCase() === code
      );

      if (!matchedAttr) {
        return {
          isValid: false,
          error: `Attribute "${key}" is not assigned to this product. Please enable "${key}" under product attributes first.`,
          selections: [],
        };
      }

      // Check if value is valid for this attribute
      const matchedVal = (matchedAttr.values || []).find(
        (v) =>
          v.value.toLowerCase() === valStr ||
          v.label.toLowerCase() === valStr ||
          v.id === valStr
      );

      if (!matchedVal) {
        return {
          isValid: false,
          error: `Value "${attributesInput[key]}" is not a valid option for attribute "${matchedAttr.name}".`,
          selections: [],
        };
      }

      selections.push({
        attributeId: matchedAttr.id,
        attributeCode: matchedAttr.code,
        attributeName: matchedAttr.name,
        attributeValueId: matchedVal.id,
        value: matchedVal.value,
        label: matchedVal.label,
        colorHex: matchedVal.colorHex,
      });
    }

    return { isValid: true, selections };
  },

  /**
   * Creates a new Product Variant
   */
  async createVariant(
    input: CreateVariantInput,
    userId: string
  ): Promise<ProductVariant> {
    const normalizedSku = normalizeSku(input.sku);

    // 1. Verify SKU uniqueness
    const skuAvailable = await this.isSkuUnique(normalizedSku);
    if (!skuAvailable) {
      throw new Error(`The SKU "${normalizedSku}" is already in use. Each variant must have a globally unique SKU.`);
    }

    // 2. Validate attributes against product
    const attrValidation = await this.validateAttributesForProduct(
      input.productId,
      input.attributes
    );
    if (!attrValidation.isValid) {
      throw new Error(attrValidation.error || "Invalid variant attribute selections.");
    }

    // 3. Build combination hash & verify uniqueness
    const combinationHash = buildCombinationHash(input.attributes);
    const combinationAvailable = await this.isCombinationUnique(
      input.productId,
      combinationHash
    );
    if (!combinationAvailable) {
      throw new Error(
        `A variant with this exact combination of options (${Object.entries(input.attributes)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")}) already exists for this product.`
      );
    }

    const nowIso = new Date().toISOString();
    const id = `var-${crypto.randomUUID()}`;

    // Compute title if default or user-provided
    const title =
      input.title.trim() ||
      attrValidation.selections.map((s) => s.label).join(" / ");

    const newVariant: ProductVariant = {
      id,
      productId: input.productId,
      sku: normalizedSku,
      barcode: input.barcode?.trim() || null,
      combinationHash,
      title,
      priceOverride: input.priceOverride ?? null,
      compareAtPrice: input.compareAtPrice ?? null,
      costPrice: input.costPrice ?? null,
      weightGrams: input.weightGrams ?? null,
      isActive: input.isActive ?? true,
      attributes: { ...input.attributes },
      images: input.mediaUrls || [],
      createdAt: nowIso,
      updatedAt: nowIso,
      selectedAttributeValues: attrValidation.selections,
      stockQuantity: 0,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const inserted = await db
          .insert(variantsTable)
          .values({
            id: newVariant.id,
            productId: newVariant.productId,
            sku: newVariant.sku,
            barcode: newVariant.barcode,
            combinationHash: newVariant.combinationHash,
            title: newVariant.title,
            priceOverride: newVariant.priceOverride ? newVariant.priceOverride.toFixed(2) : null,
            compareAtPrice: newVariant.compareAtPrice ? newVariant.compareAtPrice.toFixed(2) : null,
            costPrice: newVariant.costPrice ? newVariant.costPrice.toFixed(2) : null,
            weightGrams: newVariant.weightGrams,
            isActive: newVariant.isActive,
            attributesSummary: input.attributes,
          })
          .returning();

        if (inserted[0]) {
          newVariant.id = inserted[0].id;
        }

        // Insert variant attribute value junctions
        for (const sel of attrValidation.selections) {
          await db.insert(variantAttrValsTable).values({
            variantId: newVariant.id,
            attributeId: sel.attributeId,
            attributeValueId: sel.attributeValueId,
          }).onConflictDoNothing();
        }

        // Attach variant media
        if (input.mediaUrls && input.mediaUrls.length > 0) {
          for (let i = 0; i < input.mediaUrls.length; i++) {
            await db.insert(productMediaTable).values({
              productId: input.productId,
              variantId: newVariant.id,
              url: input.mediaUrls[i],
              altText: `${title} - ${i + 1}`,
              sortOrder: i,
              isPrimary: i === 0,
            });
          }
        }

        // Initialize inventory level record (stock 0)
        await db.insert(inventoryLevelsTable).values({
          variantId: newVariant.id,
          stockQuantity: 0,
          reservedQuantity: 0,
          lowStockThreshold: 5,
        }).onConflictDoNothing();
      } catch (err: any) {
        console.warn("DB createVariant failed, falling back to memory:", err);
        // Catch postgres unique constraint violations
        if (err?.code === "23505") {
          if (String(err.detail).includes("sku")) {
            throw new Error(`Database Integrity Error: The SKU "${normalizedSku}" is already in use.`);
          }
          if (String(err.detail).includes("combination_hash")) {
            throw new Error(`Database Integrity Error: A variant with this exact combination already exists for this product.`);
          }
        }
      }
    }

    memoryVariants.set(newVariant.id, newVariant);

    // Audit log
    await recordAuditLog({
      userId,
      action: "create",
      entityType: "product_variant",
      entityId: newVariant.id,
      changes: {
        after: {
          id: newVariant.id,
          sku: newVariant.sku,
          productId: newVariant.productId,
          attributes: newVariant.attributes,
          priceOverride: newVariant.priceOverride,
        },
      },
    });

    return newVariant;
  },

  /**
   * Updates an existing Product Variant
   */
  async updateVariant(
    input: UpdateVariantInput,
    userId: string
  ): Promise<ProductVariant> {
    const existing = await this.getVariantById(input.id);
    if (!existing) {
      throw new Error(`Product variant with ID "${input.id}" was not found.`);
    }

    const normalizedSku = normalizeSku(input.sku);

    // 1. Verify SKU uniqueness if changed
    if (normalizedSku !== normalizeSku(existing.sku)) {
      const skuAvailable = await this.isSkuUnique(normalizedSku, input.id);
      if (!skuAvailable) {
        throw new Error(`The SKU "${normalizedSku}" is already in use by another variant.`);
      }
    }

    // 2. Validate attributes against product
    const attrValidation = await this.validateAttributesForProduct(
      input.productId,
      input.attributes
    );
    if (!attrValidation.isValid) {
      throw new Error(attrValidation.error || "Invalid variant attribute selections.");
    }

    // 3. Build combination hash & verify uniqueness if changed
    const combinationHash = buildCombinationHash(input.attributes);
    if (combinationHash !== existing.combinationHash) {
      const combinationAvailable = await this.isCombinationUnique(
        input.productId,
        combinationHash,
        input.id
      );
      if (!combinationAvailable) {
        throw new Error(
          `A variant with this exact combination of options (${Object.entries(input.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")}) already exists for this product.`
        );
      }
    }

    const nowIso = new Date().toISOString();
    const updatedVariant: ProductVariant = {
      ...existing,
      sku: normalizedSku,
      barcode: input.barcode?.trim() || null,
      combinationHash,
      title: input.title.trim() || existing.title,
      priceOverride: input.priceOverride ?? null,
      compareAtPrice: input.compareAtPrice ?? null,
      costPrice: input.costPrice ?? null,
      weightGrams: input.weightGrams ?? null,
      isActive: input.isActive,
      attributes: { ...input.attributes },
      images: input.mediaUrls || existing.images,
      updatedAt: nowIso,
      selectedAttributeValues: attrValidation.selections,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(variantsTable)
          .set({
            sku: updatedVariant.sku,
            barcode: updatedVariant.barcode,
            combinationHash: updatedVariant.combinationHash,
            title: updatedVariant.title,
            priceOverride: updatedVariant.priceOverride ? updatedVariant.priceOverride.toFixed(2) : null,
            compareAtPrice: updatedVariant.compareAtPrice ? updatedVariant.compareAtPrice.toFixed(2) : null,
            costPrice: updatedVariant.costPrice ? updatedVariant.costPrice.toFixed(2) : null,
            weightGrams: updatedVariant.weightGrams,
            isActive: updatedVariant.isActive,
            attributesSummary: input.attributes,
            updatedAt: new Date(),
          })
          .where(eq(variantsTable.id, input.id));

        // Re-sync attribute value junctions
        await db
          .delete(variantAttrValsTable)
          .where(eq(variantAttrValsTable.variantId, input.id));

        for (const sel of attrValidation.selections) {
          await db.insert(variantAttrValsTable).values({
            variantId: input.id,
            attributeId: sel.attributeId,
            attributeValueId: sel.attributeValueId,
          }).onConflictDoNothing();
        }

        // Re-sync media if provided
        if (input.mediaUrls) {
          await db
            .delete(productMediaTable)
            .where(eq(productMediaTable.variantId, input.id));

          for (let i = 0; i < input.mediaUrls.length; i++) {
            await db.insert(productMediaTable).values({
              productId: input.productId,
              variantId: input.id,
              url: input.mediaUrls[i],
              altText: `${updatedVariant.title} - ${i + 1}`,
              sortOrder: i,
              isPrimary: i === 0,
            });
          }
        }
      } catch (err: any) {
        console.warn("DB updateVariant failed, updating memory:", err);
        if (err?.code === "23505") {
          throw new Error("Database Unique Constraint Violation: Duplicate SKU or combination detected.");
        }
      }
    }

    memoryVariants.set(input.id, updatedVariant);

    await recordAuditLog({
      userId,
      action: "update",
      entityType: "product_variant",
      entityId: input.id,
      changes: {
        before: {
          sku: existing.sku,
          attributes: existing.attributes,
          priceOverride: existing.priceOverride,
          isActive: existing.isActive,
        },
        after: {
          sku: updatedVariant.sku,
          attributes: updatedVariant.attributes,
          priceOverride: updatedVariant.priceOverride,
          isActive: updatedVariant.isActive,
        },
      },
    });

    return updatedVariant;
  },

  /**
   * Toggles variant active state
   */
  async toggleVariantStatus(
    id: string,
    isActive: boolean,
    userId: string
  ): Promise<ProductVariant> {
    const existing = await this.getVariantById(id);
    if (!existing) {
      throw new Error(`Variant with ID "${id}" was not found.`);
    }

    const nowIso = new Date().toISOString();
    const updated: ProductVariant = {
      ...existing,
      isActive,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(variantsTable)
          .set({
            isActive,
            updatedAt: new Date(),
          })
          .where(eq(variantsTable.id, id));
      } catch (err) {
        console.warn("DB toggleVariantStatus failed, using memory:", err);
      }
    }

    memoryVariants.set(id, updated);

    await recordAuditLog({
      userId,
      action: isActive ? "activate_variant" : "deactivate_variant",
      entityType: "product_variant",
      entityId: id,
      changes: { before: { isActive: existing.isActive }, after: { isActive } },
    });

    return updated;
  },

  /**
   * Archives a variant (soft delete)
   */
  async archiveVariant(id: string, userId: string): Promise<ProductVariant> {
    const existing = await this.getVariantById(id);
    if (!existing) {
      throw new Error(`Variant with ID "${id}" was not found.`);
    }

    const nowIso = new Date().toISOString();
    const updated: ProductVariant = {
      ...existing,
      isActive: false,
      deletedAt: nowIso,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(variantsTable)
          .set({
            isActive: false,
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(variantsTable.id, id));
      } catch (err) {
        console.warn("DB archiveVariant failed, using memory:", err);
      }
    }

    memoryVariants.set(id, updated);

    await recordAuditLog({
      userId,
      action: "archive",
      entityType: "product_variant",
      entityId: id,
      changes: { before: existing, after: updated },
    });

    return updated;
  },

  /**
   * Restores an archived variant
   */
  async restoreVariant(id: string, userId: string): Promise<ProductVariant> {
    const existing = await this.getVariantById(id);
    if (!existing) {
      throw new Error(`Variant with ID "${id}" was not found.`);
    }

    // Check if another active variant currently has the same combination
    const combinationAvailable = await this.isCombinationUnique(
      existing.productId,
      existing.combinationHash,
      existing.id
    );
    if (!combinationAvailable) {
      throw new Error(
        "Cannot restore: another active variant with this exact combination already exists."
      );
    }

    const nowIso = new Date().toISOString();
    const updated: ProductVariant = {
      ...existing,
      isActive: true,
      deletedAt: null,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(variantsTable)
          .set({
            isActive: true,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(variantsTable.id, id));
      } catch (err) {
        console.warn("DB restoreVariant failed, using memory:", err);
      }
    }

    memoryVariants.set(id, updated);

    await recordAuditLog({
      userId,
      action: "restore",
      entityType: "product_variant",
      entityId: id,
      changes: { before: existing, after: updated },
    });

    return updated;
  },

  /**
   * Deletes a variant permanently (or archives if has historical orders)
   */
  async deleteVariant(id: string, userId: string): Promise<boolean> {
    const existing = await this.getVariantById(id);
    if (!existing) {
      throw new Error(`Variant with ID "${id}" was not found.`);
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db.delete(variantsTable).where(eq(variantsTable.id, id));
      } catch (err) {
        console.warn("DB deleteVariant failed, deleting from memory:", err);
      }
    }

    memoryVariants.delete(id);

    await recordAuditLog({
      userId,
      action: "delete",
      entityType: "product_variant",
      entityId: id,
      changes: { before: existing },
    });

    return true;
  },

  /**
   * Generates prospective combinations preview (Cartesian Product)
   * Shows which combinations already exist and which can be newly created.
   */
  async previewGenerateVariants(input: GenerateVariantsInput): Promise<{
    combinations: Array<{
      attributes: Record<string, string>;
      title: string;
      sku: string;
      combinationHash: string;
      isExisting: boolean;
      existingVariant?: ProductVariant;
    }>;
    totalNew: number;
    totalExisting: number;
  }> {
    const existingVariants = await this.listVariantsByProductId(input.productId, {
      includeArchived: false,
    });
    const existingMap = new Map(existingVariants.map((v) => [v.combinationHash, v]));

    // Cartesian product of attribute options
    const attrCodes = Object.keys(input.attributeOptions);
    const valueLists = attrCodes.map((code) => input.attributeOptions[code]);

    function cartesian(arrays: string[][]): string[][] {
      return arrays.reduce<string[][]>(
        (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
        [[]]
      );
    }

    const productCombinations = cartesian(valueLists);
    const allAttributes = await attributeService.listAttributes();
    const attrMap = new Map(allAttributes.map((a) => [a.code, a]));

    const result = [];
    let totalNew = 0;
    let totalExisting = 0;

    for (const combo of productCombinations) {
      const attributesRecord: Record<string, string> = {};
      const titleParts: string[] = [];
      const skuParts: string[] = [normalizeSku(input.skuPrefix)];

      for (let i = 0; i < attrCodes.length; i++) {
        const code = attrCodes[i];
        const val = combo[i];
        attributesRecord[code] = val;

        const attrObj = attrMap.get(code);
        const valObj = (attrObj?.values || []).find((v) => v.value === val);
        titleParts.push(valObj?.label || val);
        skuParts.push(val.toUpperCase().replace(/[^A-Z0-9]/g, ""));
      }

      const combinationHash = buildCombinationHash(attributesRecord);
      const existing = existingMap.get(combinationHash);
      const isExisting = Boolean(existing);

      if (isExisting) {
        totalExisting++;
      } else {
        totalNew++;
      }

      result.push({
        attributes: attributesRecord,
        title: titleParts.join(" / "),
        sku: skuParts.join("-"),
        combinationHash,
        isExisting,
        existingVariant: existing,
      });
    }

    return {
      combinations: result,
      totalNew,
      totalExisting,
    };
  },

  /**
   * Bulk creates confirmed generated variants
   */
  async bulkCreateGeneratedVariants(
    input: GenerateVariantsInput,
    selectedItems: Array<{
      attributes: Record<string, string>;
      sku: string;
      title: string;
      priceOverride?: number | null;
    }>,
    userId: string
  ): Promise<ProductVariant[]> {
    const createdVariants: ProductVariant[] = [];

    for (const item of selectedItems) {
      try {
        const created = await this.createVariant(
          {
            productId: input.productId,
            sku: item.sku,
            title: item.title,
            priceOverride: item.priceOverride ?? input.basePriceOverride ?? null,
            attributes: item.attributes,
            isActive: true,
            mediaUrls: [],
          },
          userId
        );
        createdVariants.push(created);
      } catch (err) {
        console.warn(`Skipping duplicate or failed combo ${item.sku}:`, err);
      }
    }

    await recordAuditLog({
      userId,
      action: "generate_variants",
      entityType: "product",
      entityId: input.productId,
      changes: { after: { createdCount: createdVariants.length } },
    });

    return createdVariants;
  },
};
