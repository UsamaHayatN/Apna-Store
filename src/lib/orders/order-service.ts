import { isDatabaseConfigured, getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { CartItemDetail } from "@/lib/cart/cart-service";

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string | null;
  variantId: string | null;
  productTitle: string;
  variantTitle: string;
  sku: string;
  variantAttributes: Record<string, string>;
  thumbnailUrl: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerEmail: string;
  customerPhone: string | null;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  shippingAddressSnapshot: Record<string, any>;
  billingAddressSnapshot: Record<string, any> | null;
  appliedCouponCode: string | null;
  shippingMethodSnapshot: {
    id: string;
    name: string;
    price: number;
    estimatedDays: string;
  };
  paymentMethodSnapshot: {
    type: string;
    last4?: string;
    cardholderName?: string;
    brand?: string;
  };
  customerNotes: string | null;
  items: OrderItemRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderParams {
  userId?: string | null;
  customerEmail: string;
  customerPhone?: string | null;
  shippingAddress: Record<string, any>;
  billingAddress?: Record<string, any> | null;
  shippingMethod: {
    id: string;
    name: string;
    price: number;
    estimatedDays: string;
  };
  paymentMethod: {
    type: string;
    last4?: string;
    cardholderName?: string;
    brand?: string;
  };
  items: CartItemDetail[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string | null;
  taxAmount: number;
  totalAmount: number;
  customerNotes?: string | null;
}

// Global in-memory storage for orders
declare global {
  // eslint-disable-next-line no-var
  var _memoryOrderRegistry: Map<string, OrderRecord> | undefined;
}

const memoryOrders: Map<string, OrderRecord> =
  global._memoryOrderRegistry || (global._memoryOrderRegistry = new Map());

// Pre-seed mock client orders if empty
if (memoryOrders.size === 0) {
  const seedOrder: OrderRecord = {
    id: "ord-10001",
    orderNumber: "ORD-2026-8091",
    userId: "usr-client-00000004",
    customerEmail: "client@atelier.internal",
    customerPhone: "+1 (555) 019-2834",
    subtotalAmount: 495.0,
    discountAmount: 0.0,
    shippingAmount: 0.0,
    taxAmount: 39.6,
    totalAmount: 534.6,
    currency: "USD",
    orderStatus: "delivered",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    shippingAddressSnapshot: {
      recipientName: "Lord Julian Vance",
      addressLine1: "740 Park Avenue",
      city: "New York",
      stateProvince: "NY",
      postalCode: "10021",
      countryCode: "US",
      phone: "+1 555-0190",
    },
    billingAddressSnapshot: null,
    appliedCouponCode: null,
    shippingMethodSnapshot: {
      id: "standard",
      name: "Standard Atelier Delivery",
      price: 0,
      estimatedDays: "3-5 business days",
    },
    paymentMethodSnapshot: {
      type: "card",
      last4: "4242",
      cardholderName: "Julian Vance",
      brand: "Visa",
    },
    customerNotes: "Please leave package with concierge.",
    items: [
      {
        id: "oi-101",
        orderId: "ord-10001",
        productId: "prd-001",
        variantId: "var-001",
        productTitle: "The Sovereign Oxford - Onyx Black",
        variantTitle: "Size 42 / Onyx Black",
        sku: "SOV-OXF-BLK-42",
        variantAttributes: { Size: "42", Color: "Onyx Black" },
        thumbnailUrl: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80",
        unitPrice: 495.0,
        quantity: 1,
        totalPrice: 495.0,
      },
    ],
    createdAt: "2026-02-14T14:30:00.000Z",
    updatedAt: "2026-02-14T14:30:00.000Z",
  };
  memoryOrders.set(seedOrder.id, seedOrder);
}

export class OrderService {
  /**
   * Create an order from validated checkout items
   */
  async createOrder(params: CreateOrderParams): Promise<OrderRecord> {
    const orderId = `ord-${crypto.randomUUID()}`;
    const timestamp = Date.now().toString().slice(-4);
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${new Date().getFullYear()}-${timestamp}${randomCode}`;
    const now = new Date().toISOString();

    const orderItems: OrderItemRecord[] = params.items.map((item, idx) => ({
      id: `oi-${crypto.randomUUID().slice(0, 8)}-${idx}`,
      orderId,
      productId: item.productId || null,
      variantId: item.variantId || null,
      productTitle: item.productTitle,
      variantTitle: item.variantTitle || `${item.brand} - Regular`,
      sku: item.variantSku || `SKU-${item.productId.slice(0, 8).toUpperCase()}`,
      variantAttributes: item.variantAttributes || {},
      thumbnailUrl: item.imageUrl || null,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      totalPrice: item.lineTotal,
    }));

    const newOrder: OrderRecord = {
      id: orderId,
      orderNumber,
      userId: params.userId || null,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone || null,
      subtotalAmount: params.subtotal,
      discountAmount: params.discountAmount,
      shippingAmount: params.shippingMethod.price,
      taxAmount: params.taxAmount,
      totalAmount: params.totalAmount,
      currency: "USD",
      orderStatus: "confirmed",
      paymentStatus: "paid",
      fulfillmentStatus: "unfulfilled",
      shippingAddressSnapshot: params.shippingAddress,
      billingAddressSnapshot: params.billingAddress || params.shippingAddress,
      appliedCouponCode: params.couponCode || null,
      shippingMethodSnapshot: params.shippingMethod,
      paymentMethodSnapshot: params.paymentMethod,
      customerNotes: params.customerNotes || null,
      items: orderItems,
      createdAt: now,
      updatedAt: now,
    };

    // Save to in-memory registry
    memoryOrders.set(orderId, newOrder);

    // Save to Database if configured
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db.insert(schema.orders).values({
          id: orderId,
          orderNumber,
          userId: params.userId || null,
          customerEmail: params.customerEmail,
          customerPhone: params.customerPhone || null,
          subtotalAmount: params.subtotal.toFixed(2),
          discountAmount: params.discountAmount.toFixed(2),
          shippingAmount: params.shippingMethod.price.toFixed(2),
          taxAmount: params.taxAmount.toFixed(2),
          totalAmount: params.totalAmount.toFixed(2),
          currency: "USD",
          orderStatus: "confirmed",
          paymentStatus: "paid",
          fulfillmentStatus: "unfulfilled",
          shippingAddressSnapshot: params.shippingAddress,
          billingAddressSnapshot: params.billingAddress || params.shippingAddress,
          appliedCouponCode: params.couponCode || null,
          customerNotes: params.customerNotes || null,
          adminNotes: `Shipping: ${params.shippingMethod.name} ($${params.shippingMethod.price.toFixed(2)}). Payment: ${params.paymentMethod.type}`,
        });

        for (const it of orderItems) {
          await db.insert(schema.orderItems).values({
            orderId,
            productId: it.productId,
            variantId: it.variantId,
            productTitleSnapshot: it.productTitle,
            variantTitleSnapshot: it.variantTitle,
            variantSkuSnapshot: it.sku,
            variantAttributesSnapshot: it.variantAttributes,
            thumbnailUrlSnapshot: it.thumbnailUrl,
            unitPriceSnapshot: it.unitPrice.toFixed(2),
            quantity: it.quantity,
            discountAmount: "0.00",
            taxAmount: "0.00",
            totalPrice: it.totalPrice.toFixed(2),
          });
        }

        await db.insert(schema.orderStatusHistory).values({
          orderId,
          previousStatus: null,
          newStatus: "confirmed",
          changedByType: "system",
          changedByUserId: params.userId || null,
          notes: "Order successfully placed and authorized.",
          notifyCustomer: true,
        });
      } catch (err) {
        console.warn("DB createOrder warning (saved to memory):", err);
      }
    }

    return newOrder;
  }

  async getOrderById(orderId: string): Promise<OrderRecord | null> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.id, orderId))
          .limit(1);

        if (rows.length > 0) {
          const o = rows[0];
          const itemRows = await db
            .select()
            .from(schema.orderItems)
            .where(eq(schema.orderItems.orderId, o.id));

          return {
            id: o.id,
            orderNumber: o.orderNumber,
            userId: o.userId,
            customerEmail: o.customerEmail,
            customerPhone: o.customerPhone,
            subtotalAmount: parseFloat(o.subtotalAmount),
            discountAmount: parseFloat(o.discountAmount),
            shippingAmount: parseFloat(o.shippingAmount),
            taxAmount: parseFloat(o.taxAmount),
            totalAmount: parseFloat(o.totalAmount),
            currency: o.currency,
            orderStatus: o.orderStatus,
            paymentStatus: o.paymentStatus,
            fulfillmentStatus: o.fulfillmentStatus,
            shippingAddressSnapshot: (o.shippingAddressSnapshot as Record<string, any>) || {},
            billingAddressSnapshot: (o.billingAddressSnapshot as Record<string, any>) || null,
            appliedCouponCode: o.appliedCouponCode,
            shippingMethodSnapshot: {
              id: "standard",
              name: "Standard Atelier Delivery",
              price: parseFloat(o.shippingAmount),
              estimatedDays: "3-5 business days",
            },
            paymentMethodSnapshot: {
              type: "card",
              last4: "4242",
              brand: "Visa",
            },
            customerNotes: o.customerNotes,
            items: itemRows.map((it) => ({
              id: it.id,
              orderId: it.orderId,
              productId: it.productId,
              variantId: it.variantId,
              productTitle: it.productTitleSnapshot,
              variantTitle: it.variantTitleSnapshot,
              sku: it.variantSkuSnapshot,
              variantAttributes: it.variantAttributesSnapshot || {},
              thumbnailUrl: it.thumbnailUrlSnapshot,
              unitPrice: parseFloat(it.unitPriceSnapshot),
              quantity: it.quantity,
              totalPrice: parseFloat(it.totalPrice),
            })),
            createdAt: o.createdAt.toISOString(),
            updatedAt: o.updatedAt.toISOString(),
          };
        }
      } catch (err) {
        console.warn("DB getOrderById error, using memory fallback:", err);
      }
    }

    const mem = memoryOrders.get(orderId);
    return mem ? { ...mem } : null;
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderRecord | null> {
    for (const order of memoryOrders.values()) {
      if (order.orderNumber === orderNumber) {
        return { ...order };
      }
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.orderNumber, orderNumber))
          .limit(1);

        if (rows.length > 0) {
          return this.getOrderById(rows[0].id);
        }
      } catch (err) {
        console.warn("DB getOrderByNumber error:", err);
      }
    }

    return null;
  }

  async getOrdersByUserId(userId: string): Promise<OrderRecord[]> {
    const list: OrderRecord[] = [];

    for (const order of memoryOrders.values()) {
      if (order.userId === userId) {
        list.push({ ...order });
      }
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.userId, userId))
          .orderBy(desc(schema.orders.createdAt));

        if (rows.length > 0) {
          const dbOrders: OrderRecord[] = [];
          for (const r of rows) {
            const full = await this.getOrderById(r.id);
            if (full) dbOrders.push(full);
          }
          return dbOrders;
        }
      } catch (err) {
        console.warn("DB getOrdersByUserId error:", err);
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllOrders(): Promise<OrderRecord[]> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(schema.orders)
          .orderBy(desc(schema.orders.createdAt));

        if (rows.length > 0) {
          const dbOrders: OrderRecord[] = [];
          for (const r of rows) {
            const full = await this.getOrderById(r.id);
            if (full) dbOrders.push(full);
          }
          return dbOrders;
        }
      } catch (err) {
        console.warn("DB getAllOrders error:", err);
      }
    }

    return Array.from(memoryOrders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: string,
    changedBy: { id?: string; type: "admin" | "staff" | "system" | "customer" },
    notes?: string
  ): Promise<boolean> {
    const mem = memoryOrders.get(orderId);
    const prevStatus = mem ? mem.orderStatus : null;

    if (mem) {
      mem.orderStatus = newStatus;
      mem.updatedAt = new Date().toISOString();
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(schema.orders)
          .set({ orderStatus: newStatus, updatedAt: new Date() })
          .where(eq(schema.orders.id, orderId));

        await db.insert(schema.orderStatusHistory).values({
          orderId,
          previousStatus: prevStatus,
          newStatus,
          changedByType: changedBy.type,
          changedByUserId: changedBy.id || null,
          notes: notes || `Order status updated to ${newStatus}`,
          notifyCustomer: true,
        });
      } catch (err) {
        console.warn("DB updateOrderStatus error:", err);
      }
    }

    return true;
  }

  async updateOrderPaymentStatus(
    orderId: string,
    newPaymentStatus: string,
    notes?: string
  ): Promise<boolean> {
    const mem = memoryOrders.get(orderId);
    if (mem) {
      mem.paymentStatus = newPaymentStatus;
      mem.updatedAt = new Date().toISOString();
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(schema.orders)
          .set({ paymentStatus: newPaymentStatus, updatedAt: new Date() })
          .where(eq(schema.orders.id, orderId));
      } catch (err) {
        console.warn("DB updateOrderPaymentStatus error:", err);
      }
    }

    return true;
  }

  async updateOrderFulfillmentStatus(
    orderId: string,
    newFulfillmentStatus: string,
    notes?: string
  ): Promise<boolean> {
    const mem = memoryOrders.get(orderId);
    if (mem) {
      mem.fulfillmentStatus = newFulfillmentStatus;
      mem.updatedAt = new Date().toISOString();
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(schema.orders)
          .set({ fulfillmentStatus: newFulfillmentStatus, updatedAt: new Date() })
          .where(eq(schema.orders.id, orderId));
      } catch (err) {
        console.warn("DB updateOrderFulfillmentStatus error:", err);
      }
    }

    return true;
  }
}

export const orderService = new OrderService();
