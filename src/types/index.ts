export type UserRole = "customer" | "staff" | "admin" | "owner";

export type AccountStatus = "active" | "suspended" | "disabled" | "pending";

export type PermissionCode =
  | "products.read"
  | "products.create"
  | "products.update"
  | "products.delete"
  | "categories.read"
  | "categories.create"
  | "categories.update"
  | "categories.delete"
  | "collections.read"
  | "collections.create"
  | "collections.update"
  | "collections.delete"
  | "inventory.read"
  | "inventory.update"
  | "orders.read"
  | "orders.update"
  | "orders.delete"
  | "customers.read"
  | "customers.update"
  | "coupons.read"
  | "coupons.create"
  | "coupons.update"
  | "coupons.delete"
  | "settings.read"
  | "settings.update"
  | "users.read"
  | "users.create"
  | "users.update"
  | "users.delete"
  | "roles.read"
  | "roles.update"
  | "audit.read";

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: AccountStatus;
  emailVerifiedAt?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  status: AccountStatus;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  recipientName: string;
  company?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
  phone: string;
  isDefault: boolean;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  addressType?: "shipping" | "billing" | "both";
  createdAt: string;
}

export interface Category {
  id: string;
  parentId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  level?: number;
  path?: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  metadata?: Record<string, unknown>;
  productCount?: number;
  activeProductCount?: number;
  childrenCount?: number;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  parent?: Category | null;
  children?: Category[];
}

export interface Collection {
  id: string;
  title: string;
  name?: string; // friendly alias for title
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: Record<string, unknown>;
  productCount?: number;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionProductItem {
  productId: string;
  collectionId: string;
  sortOrder: number;
  addedAt?: string;
  product?: {
    id: string;
    title: string;
    slug: string;
    brand: string;
    basePrice: number;
    status: string;
    primaryCategoryName?: string;
    thumbnailUrl?: string | null;
  };
}

export type ProductStatus = "draft" | "active" | "archived";

export interface ProductAttributeMap {
  [key: string]: string | number | boolean | undefined;
}

export type AttributeType = "select" | "color_swatch" | "button_pill" | "text";

export interface AttributeValue {
  id: string;
  attributeId: string;
  value: string;
  label: string;
  colorHex?: string | null;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface Attribute {
  id: string;
  code: string;
  name: string;
  type: AttributeType;
  displayOrder: number;
  createdAt?: string;
  values?: AttributeValue[];
}

export interface ProductAttribute {
  productId: string;
  attributeId: string;
  sortOrder: number;
  attribute?: Attribute;
}

export interface VariantAttributeValueSelection {
  attributeId: string;
  attributeCode: string;
  attributeName: string;
  attributeValueId: string;
  value: string;
  label: string;
  colorHex?: string | null;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  combinationHash: string;
  title: string;
  priceOverride?: number | null;
  compareAtPrice?: number | null;
  salePrice?: number | null;
  costPrice?: number | null;
  weightGrams?: number | null;
  attributes: ProductAttributeMap;
  images: string[];
  media?: ProductMedia[];
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  selectedAttributeValues?: VariantAttributeValueSelection[];
  // Included when joined with inventory
  stockQuantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
}

export interface ProductType {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  hasVariants: boolean;
  isShippable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductMedia {
  id: string;
  productId: string;
  variantId?: string | null;
  url: string;
  storageKey?: string | null;
  altText?: string | null;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  productTypeId: string;
  productType?: ProductType;
  primaryCategoryId: string;
  categoryId?: string; // backwards compatibility alias
  category?: Category;
  primaryCategory?: Category;
  brand: string;
  title: string;
  slug: string;
  modelCode?: string | null;
  shortDescription?: string | null;
  description: string;
  basePrice: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  status: ProductStatus;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  hasVariants: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  metadata?: Record<string, unknown>;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  media?: ProductMedia[];
  variants?: ProductVariant[];
  assignedAttributes?: Attribute[];
  minPrice?: number;
  maxPrice?: number;
  variantCount?: number;
  stockCount?: number;
}

export type InventoryTransactionReason =
  | "restock"
  | "reservation"
  | "fulfillment"
  | "cancellation_return"
  | "damage_adjustment"
  | "manual_audit";

export type InventoryStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryLevel {
  id: string;
  variantId: string;
  warehouseLocation?: string;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  reorderPoint?: number;
  allowBackorder?: boolean;
  updatedAt: string;
}

export interface InventoryItemDetail {
  id: string;
  variantId: string;
  sku: string;
  barcode?: string | null;
  productTitle: string;
  variantTitle: string;
  productId: string;
  warehouseLocation: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  reorderPoint: number;
  allowBackorder: boolean;
  stockStatus: InventoryStockStatus;
  attributes: Record<string, string>;
  thumbnailUrl?: string | null;
  price: number;
  costPrice?: number | null;
  updatedAt: string;
}

export interface InventoryTransactionDetail {
  id: string;
  variantId: string;
  sku?: string;
  variantTitle?: string;
  productTitle?: string;
  orderId?: string | null;
  changeQuantity: number;
  resultingQuantity: number;
  reason: InventoryTransactionReason | string;
  performedByUserId?: string | null;
  performedByName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InventorySummaryStats {
  totalSkus: number;
  totalUnitsOnHand: number;
  totalReservedUnits: number;
  totalAvailableUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValuation: number;
}

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  variant?: ProductVariant & { product?: Product };
  createdAt: string;
}

export interface Cart {
  id: string;
  userId?: string | null;
  guestSessionToken?: string | null;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded";

export type PaymentStatus =
  | "unpaid"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded";

export interface OrderItem {
  id: string;
  orderId: string;
  variantId?: string | null;
  productTitleSnapshot: string;
  variantSkuSnapshot: string;
  variantAttributesSnapshot: ProductAttributeMap;
  unitPriceSnapshot: number;
  quantity: number;
  totalPrice: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerEmail: string;
  customerPhone?: string | null;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddressSnapshot: Record<string, unknown>;
  billingAddressSnapshot?: Record<string, unknown> | null;
  appliedCouponCode?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  customerNotes?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  minimumOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimitTotal?: number | null;
  timesUsed: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
