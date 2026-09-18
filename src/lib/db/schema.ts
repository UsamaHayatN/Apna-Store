import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =============================================================================
// 1. STORE CONFIGURATION & SETTINGS
// =============================================================================
export const storeSettings = pgTable(
  "store_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 100 }).notNull().unique(),
    value: jsonb("value").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").default(false).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("store_settings_key_uidx").on(table.key),
  ]
);

// =============================================================================
// 2. USERS, ROLES & ACCESS CONTROL (RBAC)
// =============================================================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    role: varchar("role", { length: 20 }).default("customer").notNull(), // customer | staff | admin | owner
    status: varchar("status", { length: 20 }).default("active").notNull(), // active | suspended | pending | disabled
    emailVerifiedAt: timestamp("email_verified_at"),
    lastLoginAt: timestamp("last_login_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_uidx").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_status_idx").on(table.status),
  ]
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("roles_slug_uidx").on(table.slug),
  ]
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 100 }).notNull().unique(), // e.g. "products:create", "inventory:adjust"
    name: varchar("name", { length: 100 }).notNull(),
    module: varchar("module", { length: 50 }).notNull(), // products | inventory | orders | customers | settings
    description: text("description"),
  },
  (table) => [
    uniqueIndex("permissions_code_uidx").on(table.code),
    index("permissions_module_idx").on(table.module),
  ]
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
  ]
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
  ]
);

// Customer Address Book (Multiple shipping / billing addresses)
export const userAddresses = pgTable(
  "user_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    addressType: varchar("address_type", { length: 20 }).default("both").notNull(), // shipping | billing | both
    recipientName: varchar("recipient_name", { length: 255 }).notNull(),
    company: varchar("company", { length: 255 }),
    addressLine1: varchar("address_line1", { length: 255 }).notNull(),
    addressLine2: varchar("address_line2", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    stateProvince: varchar("state_province", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 50 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).default("US").notNull(), // ISO 3166-1 alpha-2
    phone: varchar("phone", { length: 50 }).notNull(),
    isDefaultShipping: boolean("is_default_shipping").default(false).notNull(),
    isDefaultBilling: boolean("is_default_billing").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_addresses_user_id_idx").on(table.userId),
  ]
);

// Password Reset Tokens (Secure hashed token storage)
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("password_reset_token_hash_uidx").on(table.tokenHash),
    index("password_reset_user_id_idx").on(table.userId),
  ]
);

// Email Verification Tokens
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("email_verification_token_hash_uidx").on(table.tokenHash),
    index("email_verification_user_id_idx").on(table.userId),
  ]
);

// =============================================================================
// 3. TAXONOMY, PRODUCT TYPES & COLLECTIONS
// =============================================================================

// High-level structural merchandise type (e.g. Footwear, Apparel, Accessories)
export const productTypes = pgTable(
  "product_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    hasVariants: boolean("has_variants").default(true).notNull(),
    isShippable: boolean("is_shippable").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_types_slug_uidx").on(table.slug),
  ]
);

// Hierarchical Categories (Arbitrary tree depth: Men -> Footwear -> Oxford Shoes)
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id"), // Self-reference defined in relations
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    imageAlt: varchar("image_alt", { length: 255 }),
    level: integer("level").default(0).notNull(), // 0 = Root, 1 = Subcategory, 2 = Leaf
    path: varchar("path", { length: 500 }), // e.g. "/men/footwear/dress-shoes" for fast breadcrumbs
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("categories_slug_uidx").on(table.slug),
    index("categories_parent_id_idx").on(table.parentId),
    index("categories_is_active_idx").on(table.isActive),
    index("categories_is_featured_idx").on(table.isFeatured),
  ]
);

// Curated Marketing / Seasonal Collections (e.g. "Summer 2026", "Minimalist Workwear")
export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    imageAlt: varchar("image_alt", { length: 255 }),
    isPublished: boolean("is_published").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("collections_slug_uidx").on(table.slug),
    index("collections_is_published_idx").on(table.isPublished),
    index("collections_is_featured_idx").on(table.isFeatured),
  ]
);

// =============================================================================
// 4. FLEXIBLE ATTRIBUTE SYSTEM (Not hardcoded to shoes or clothing)
// =============================================================================
export const attributes = pgTable(
  "attributes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(), // e.g. "size", "color", "waist", "fit", "material"
    name: varchar("name", { length: 100 }).notNull(), // Customer-facing: "Size", "Color", "Waist Size"
    type: varchar("type", { length: 30 }).default("select").notNull(), // select | color_swatch | button_pill | text
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("attributes_code_uidx").on(table.code),
  ]
);

export const attributeValues = pgTable(
  "attribute_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attributeId: uuid("attribute_id").notNull().references(() => attributes.id, { onDelete: "cascade" }),
    value: varchar("value", { length: 100 }).notNull(), // Internal normalized: "42", "black", "slim", "32x34"
    label: varchar("label", { length: 100 }).notNull(), // User-facing: "EU 42 / US 9", "Onyx Black", "Slim Fit"
    colorHex: varchar("color_hex", { length: 7 }), // Optional hex code for swatch UI: "#1A1A1A"
    sortOrder: integer("sort_order").default(0).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("attribute_values_attr_val_uidx").on(table.attributeId, table.value),
    index("attribute_values_attribute_id_idx").on(table.attributeId),
  ]
);

// =============================================================================
// 5. PRODUCTS MASTER CONTAINER
// =============================================================================
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productTypeId: uuid("product_type_id").notNull().references(() => productTypes.id, { onDelete: "restrict" }),
    primaryCategoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
    brand: varchar("brand", { length: 150 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    modelCode: varchar("model_code", { length: 100 }), // Style/Model code, e.g. "OXF-200"
    shortDescription: text("short_description"),
    description: text("description").notNull(),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }), // MSRP / Strike-through
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }), // Cost of goods for merchant margins
    status: varchar("status", { length: 20 }).default("active").notNull(), // draft | active | archived
    isFeatured: boolean("is_featured").default(false).notNull(),
    isNewArrival: boolean("is_new_arrival").default(false).notNull(),
    isOnSale: boolean("is_on_sale").default(false).notNull(),
    hasVariants: boolean("has_variants").default(true).notNull(),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("products_slug_uidx").on(table.slug),
    index("products_category_id_idx").on(table.primaryCategoryId),
    index("products_type_id_idx").on(table.productTypeId),
    index("products_status_idx").on(table.status),
    index("products_featured_idx").on(table.isFeatured),
    index("products_new_arrival_idx").on(table.isNewArrival),
    index("products_on_sale_idx").on(table.isOnSale),
  ]
);

// Secondary Category Junction (Allows product to belong to multiple categories without duplicate records)
export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    index("product_categories_category_id_idx").on(table.categoryId),
  ]
);

// Product Collection Junction
export const productCollections = pgTable(
  "product_collections",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.collectionId] }),
    index("product_collections_collection_id_idx").on(table.collectionId),
  ]
);

// Which attributes this product supports (e.g. Oxford shoe uses 'Size' and 'Color')
export const productAttributes = pgTable(
  "product_attributes",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id").notNull().references(() => attributes.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.attributeId] }),
  ]
);

// =============================================================================
// 6. PRODUCT VARIANTS & COMBINATIONS
// =============================================================================
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }).notNull().unique(), // The true atomic sellable unit SKU
    barcode: varchar("barcode", { length: 100 }), // UPC / EAN barcode
    // Deterministic sorted hash e.g. "color:cognac-brown|size:42" to enforce combination uniqueness
    combinationHash: varchar("combination_hash", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(), // Human readable title e.g. "Cognac Brown / 42"
    priceOverride: decimal("price_override", { precision: 10, scale: 2 }), // Nullable: falls back to product.basePrice
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
    weightGrams: integer("weight_grams"),
    isActive: boolean("is_active").default(true).notNull(),
    // Denormalized attribute map for ultra-fast catalog reading without 4-table joins
    attributesSummary: jsonb("attributes_summary").$type<Record<string, string>>().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_variants_sku_uidx").on(table.sku),
    // Enforces that no two variants of the same product share identical attribute combinations
    uniqueIndex("product_variants_product_combination_uidx").on(table.productId, table.combinationHash),
    index("product_variants_product_id_idx").on(table.productId),
    index("product_variants_is_active_idx").on(table.isActive),
  ]
);

// Normalized Junction: maps variant to exact attribute value records
export const variantAttributeValues = pgTable(
  "variant_attribute_values",
  {
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id").notNull().references(() => attributes.id, { onDelete: "cascade" }),
    attributeValueId: uuid("attribute_value_id").notNull().references(() => attributeValues.id, { onDelete: "cascade" }),
  },
  (table) => [
    // Composite PK ensures a variant can only have ONE value per attribute (e.g. cannot be both Black AND White)
    primaryKey({ columns: [table.variantId, table.attributeId] }),
    index("variant_attr_vals_val_id_idx").on(table.attributeValueId),
  ]
);

// Product Media / Imagery
export const productMedia = pgTable(
  "product_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }), // Optional variant binding
    url: text("url").notNull(),
    storageKey: varchar("storage_key", { length: 255 }), // Cloud storage bucket key
    altText: varchar("alt_text", { length: 255 }),
    mimeType: varchar("mime_type", { length: 50 }).default("image/jpeg").notNull(),
    width: integer("width"),
    height: integer("height"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("product_media_product_id_idx").on(table.productId),
    index("product_media_variant_id_idx").on(table.variantId),
    index("product_media_is_primary_idx").on(table.isPrimary),
  ]
);

// =============================================================================
// 7. INVENTORY LEVELS & TRANSACTION LEDGER
// =============================================================================
export const inventoryLevels = pgTable(
  "inventory_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }).unique(),
    warehouseLocation: varchar("warehouse_location", { length: 100 }).default("main_fulfillment_hub").notNull(),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
    reservedQuantity: integer("reserved_quantity").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
    reorderPoint: integer("reorder_point").default(10).notNull(),
    allowBackorder: boolean("allow_backorder").default(false).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("inventory_levels_variant_id_uidx").on(table.variantId),
    index("inventory_levels_stock_qty_idx").on(table.stockQuantity),
  ]
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
    orderId: uuid("order_id"), // Reference to order if caused by customer purchase
    changeQuantity: integer("change_quantity").notNull(), // Signed integer (+50 for restock, -1 for fulfillment)
    resultingQuantity: integer("resulting_quantity").notNull(),
    reason: varchar("reason", { length: 50 }).notNull(), // restock | reservation | fulfillment | cancellation_restore | return_restock | damage_writeoff | audit_adjustment
    performedByUserId: uuid("performed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("inventory_trans_variant_id_idx").on(table.variantId),
    index("inventory_trans_order_id_idx").on(table.orderId),
    index("inventory_trans_created_at_idx").on(table.createdAt),
  ]
);

// =============================================================================
// 8. CARTS & WISHLISTS (GUEST & AUTHENTICATED)
// =============================================================================
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestSessionToken: varchar("guest_session_token", { length: 255 }).unique(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("carts_user_id_idx").on(table.userId),
    uniqueIndex("carts_guest_token_uidx").on(table.guestSessionToken),
  ]
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(1).notNull(),
    priceSnapshot: decimal("price_snapshot", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("cart_items_cart_variant_uidx").on(table.cartId, table.variantId),
    index("cart_items_cart_id_idx").on(table.cartId),
  ]
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).default("My Wishlist").notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("wishlists_user_id_idx").on(table.userId),
  ]
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wishlistId: uuid("wishlist_id").notNull().references(() => wishlists.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("wishlist_items_wishlist_id_idx").on(table.wishlistId),
    index("wishlist_items_product_id_idx").on(table.productId),
    uniqueIndex("wishlist_items_unique_idx").on(table.wishlistId, table.productId),
  ]
);

// =============================================================================
// 9. COUPONS & DISCOUNTS
// =============================================================================
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(), // Upper-case coupon code (e.g. "GENTLEMAN20")
    description: text("description"),
    discountType: varchar("discount_type", { length: 20 }).notNull(), // percentage | fixed_amount | free_shipping
    discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
    minimumOrderAmount: decimal("minimum_order_amount", { precision: 10, scale: 2 }),
    maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }),
    usageLimitTotal: integer("usage_limit_total"),
    usageLimitPerCustomer: integer("usage_limit_per_customer").default(1).notNull(),
    timesUsed: integer("times_used").default(0).notNull(),
    startsAt: timestamp("starts_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("coupons_code_uidx").on(table.code),
    index("coupons_is_active_idx").on(table.isActive),
  ]
);

// Scope coupon to specific categories
export const couponCategories = pgTable(
  "coupon_categories",
  {
    couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.couponId, table.categoryId] }),
  ]
);

// Scope coupon to specific products
export const couponProducts = pgTable(
  "coupon_products",
  {
    couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.couponId, table.productId] }),
  ]
);

export const couponUsages = pgTable(
  "coupon_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("coupon_usages_coupon_id_idx").on(table.couponId),
    index("coupon_usages_user_id_idx").on(table.userId),
  ]
);

// =============================================================================
// 10. ORDERS & ORDER ITEMS (IMMUTABLE HISTORICAL FINANCIAL AUDIT)
// =============================================================================
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 50 }).notNull().unique(), // e.g. "ORD-2026-1001"
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable for guest checkout
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 50 }),
    subtotalAmount: decimal("subtotal_amount", { precision: 10, scale: 2 }).notNull(),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(), // ISO 4217 Currency at time of purchase
    orderStatus: varchar("order_status", { length: 30 }).default("pending").notNull(), // pending | confirmed | processing | packed | shipped | out_for_delivery | delivered | cancelled | returned | refunded
    paymentStatus: varchar("payment_status", { length: 30 }).default("unpaid").notNull(), // unpaid | authorized | paid | partially_refunded | refunded | failed
    fulfillmentStatus: varchar("fulfillment_status", { length: 30 }).default("unfulfilled").notNull(), // unfulfilled | partially_fulfilled | fulfilled | returned
    // Complete immutable snapshot of shipping and billing addresses
    shippingAddressSnapshot: jsonb("shipping_address_snapshot").notNull(),
    billingAddressSnapshot: jsonb("billing_address_snapshot"),
    appliedCouponCode: varchar("applied_coupon_code", { length: 50 }),
    customerNotes: text("customer_notes"),
    adminNotes: text("admin_notes"),
    cancelledAt: timestamp("cancelled_at"),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("orders_order_number_uidx").on(table.orderNumber),
    index("orders_user_id_idx").on(table.userId),
    index("orders_customer_email_idx").on(table.customerEmail),
    index("orders_order_status_idx").on(table.orderStatus),
    index("orders_payment_status_idx").on(table.paymentStatus),
    index("orders_created_at_idx").on(table.createdAt),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    // Immutable snapshots: preserves exact purchased product state even if original is modified or archived
    productTitleSnapshot: varchar("product_title_snapshot", { length: 255 }).notNull(),
    variantTitleSnapshot: varchar("variant_title_snapshot", { length: 255 }).notNull(),
    variantSkuSnapshot: varchar("variant_sku_snapshot", { length: 100 }).notNull(),
    variantAttributesSnapshot: jsonb("variant_attributes_snapshot").$type<Record<string, string>>().notNull(),
    thumbnailUrlSnapshot: text("thumbnail_url_snapshot"),
    unitPriceSnapshot: decimal("unit_price_snapshot", { precision: 10, scale: 2 }).notNull(),
    originalPriceSnapshot: decimal("original_price_snapshot", { precision: 10, scale: 2 }),
    quantity: integer("quantity").notNull(),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_variant_id_idx").on(table.variantId),
  ]
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    previousStatus: varchar("previous_status", { length: 30 }),
    newStatus: varchar("new_status", { length: 30 }).notNull(),
    changedByType: varchar("changed_by_type", { length: 20 }).default("system").notNull(), // system | customer | staff | admin
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    notifyCustomer: boolean("notify_customer").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("order_status_history_order_id_idx").on(table.orderId),
    index("order_status_history_created_at_idx").on(table.createdAt),
  ]
);

// =============================================================================
// 11. PAYMENTS & REFUNDS (PROVIDER AGNOSTIC)
// =============================================================================
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(), // stripe | paypal | manual_cod | klarna
    providerTransactionId: varchar("provider_transaction_id", { length: 255 }), // e.g. "pi_312345..."
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    status: varchar("status", { length: 30 }).default("pending").notNull(), // pending | authorized | paid | failed | cancelled | refunded | partially_refunded
    paymentMethodType: varchar("payment_method_type", { length: 50 }), // card | apple_pay | google_pay | bank_transfer | cod
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_provider_trans_id_idx").on(table.providerTransactionId),
    index("payments_status_idx").on(table.status),
  ]
);

export const paymentRefunds = pgTable(
  "payment_refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    reason: varchar("reason", { length: 100 }),
    status: varchar("status", { length: 30 }).default("succeeded").notNull(),
    providerRefundId: varchar("provider_refund_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payment_refunds_payment_id_idx").on(table.paymentId),
  ]
);

// =============================================================================
// 12. SHIPMENTS & FULFILLMENT
// =============================================================================
export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    carrier: varchar("carrier", { length: 100 }).notNull(), // FedEx | UPS | DHL | USPS | Royal Mail
    serviceName: varchar("service_name", { length: 100 }), // Priority Express | Ground | Standard 3-Day
    trackingNumber: varchar("tracking_number", { length: 100 }),
    trackingUrl: text("tracking_url"),
    status: varchar("status", { length: 30 }).default("pending").notNull(), // pending | label_created | in_transit | out_for_delivery | delivered | returned | failed
    shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
    estimatedDeliveryDate: timestamp("estimated_delivery_date"),
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shipments_order_id_idx").on(table.orderId),
    index("shipments_tracking_number_idx").on(table.trackingNumber),
    index("shipments_status_idx").on(table.status),
  ]
);

export const shipmentItems = pgTable(
  "shipment_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipmentId").notNull().references(() => shipments.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("shipment_items_shipment_id_idx").on(table.shipmentId),
  ]
);

// =============================================================================
// 13. PRODUCT REVIEWS & RATINGS
// =============================================================================
export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "set null" }), // Verified purchase check
    rating: integer("rating").notNull(), // 1 to 5 stars
    title: varchar("title", { length: 255 }),
    reviewText: text("review_text").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | approved | rejected
    isVerifiedPurchase: boolean("is_verified_purchase").default(false).notNull(),
    adminResponse: text("admin_response"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("product_reviews_product_id_idx").on(table.productId),
    index("product_reviews_status_idx").on(table.status),
    index("product_reviews_rating_idx").on(table.rating),
  ]
);

// =============================================================================
// 14. CUSTOMER NOTIFICATIONS
// =============================================================================
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(), // order_confirmation | order_shipped | order_delivered | order_cancelled | inventory_alert | promotion | system
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    actionUrl: text("action_url"),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at"),
    channel: varchar("channel", { length: 20 }).default("in_app").notNull(), // in_app | email | sms
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_is_read_idx").on(table.isRead),
  ]
);

// =============================================================================
// 15. ADMINISTRATIVE AUDIT LOGS
// =============================================================================
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(), // create | update | delete | price_change | inventory_adjustment | permission_change
    entityType: varchar("entity_type", { length: 50 }).notNull(), // product | variant | order | coupon | user | inventory | setting
    entityId: varchar("entity_id", { length: 100 }).notNull(),
    changes: jsonb("changes").$type<{ before?: unknown; after?: unknown; diff?: unknown }>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);

// =============================================================================
// 16. DRIZZLE RELATIONS GRAPH (Query Builder Associations)
// =============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(userAddresses),
  orders: many(orders),
  userRoles: many(userRoles),
  wishlists: many(wishlists),
  notifications: many(notifications),
  reviews: many(productReviews),
  auditLogs: many(auditLogs),
  passwordResetTokens: many(passwordResetTokens),
  emailVerificationTokens: many(emailVerificationTokens),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_hierarchy",
  }),
  children: many(categories, {
    relationName: "category_hierarchy",
  }),
  products: many(products),
}));

export const productTypesRelations = relations(productTypes, ({ many }) => ({
  products: many(products),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  productCollections: many(productCollections),
}));

export const attributesRelations = relations(attributes, ({ many }) => ({
  values: many(attributeValues),
  productAttributes: many(productAttributes),
}));

export const attributeValuesRelations = relations(attributeValues, ({ one, many }) => ({
  attribute: one(attributes, {
    fields: [attributeValues.attributeId],
    references: [attributes.id],
  }),
  variantAttributeValues: many(variantAttributeValues),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  productType: one(productTypes, {
    fields: [products.productTypeId],
    references: [productTypes.id],
  }),
  primaryCategory: one(categories, {
    fields: [products.primaryCategoryId],
    references: [categories.id],
  }),
  secondaryCategories: many(productCategories),
  collections: many(productCollections),
  attributes: many(productAttributes),
  variants: many(productVariants),
  media: many(productMedia),
  reviews: many(productReviews),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  inventory: one(inventoryLevels, {
    fields: [productVariants.id],
    references: [inventoryLevels.variantId],
  }),
  attributeValues: many(variantAttributeValues),
  media: many(productMedia),
  inventoryTransactions: many(inventoryTransactions),
}));

export const variantAttributeValuesRelations = relations(variantAttributeValues, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantAttributeValues.variantId],
    references: [productVariants.id],
  }),
  attribute: one(attributes, {
    fields: [variantAttributeValues.attributeId],
    references: [attributes.id],
  }),
  attributeValue: one(attributeValues, {
    fields: [variantAttributeValues.attributeValueId],
    references: [attributeValues.id],
  }),
}));

export const inventoryLevelsRelations = relations(inventoryLevels, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventoryLevels.variantId],
    references: [productVariants.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productCollectionsRelations = relations(productCollections, ({ one }) => ({
  product: one(products, {
    fields: [productCollections.productId],
    references: [products.id],
  }),
  collection: one(collections, {
    fields: [productCollections.collectionId],
    references: [collections.id],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, {
    fields: [wishlistItems.wishlistId],
    references: [wishlists.id],
  }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [wishlistItems.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  payments: many(payments),
  shipments: many(shipments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  refunds: many(paymentRefunds),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
  items: many(shipmentItems),
}));

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productReviews.userId],
    references: [users.id],
  }),
  orderItem: one(orderItems, {
    fields: [productReviews.orderItemId],
    references: [orderItems.id],
  }),
}));

// =============================================================================
// 17. TYPE INFERENCE EXPORTS
// =============================================================================
export type StoreSetting = typeof storeSettings.$inferSelect;
export type NewStoreSetting = typeof storeSettings.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type UserAddress = typeof userAddresses.$inferSelect;
export type NewUserAddress = typeof userAddresses.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export type ProductType = typeof productTypes.$inferSelect;
export type NewProductType = typeof productTypes.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

export type Attribute = typeof attributes.$inferSelect;
export type NewAttribute = typeof attributes.$inferInsert;

export type AttributeValue = typeof attributeValues.$inferSelect;
export type NewAttributeValue = typeof attributeValues.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

export type ProductMedia = typeof productMedia.$inferSelect;
export type NewProductMedia = typeof productMedia.$inferInsert;

export type InventoryLevel = typeof inventoryLevels.$inferSelect;
export type NewInventoryLevel = typeof inventoryLevels.$inferInsert;

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type NewInventoryTransaction = typeof inventoryTransactions.$inferInsert;

export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;

export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type NewWishlistItem = typeof wishlistItems.$inferInsert;

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistory = typeof orderStatusHistory.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;

export type ProductReview = typeof productReviews.$inferSelect;
export type NewProductReview = typeof productReviews.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
