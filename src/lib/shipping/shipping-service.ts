import crypto from "node:crypto";
import { isDatabaseConfigured, getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import {
  CarrierName,
  ShipmentStatus,
  CreateShipmentParams,
  ShipmentRecord,
  TrackingDetails,
} from "./types";
import { orderService } from "@/lib/orders/order-service";

declare global {
  // eslint-disable-next-line no-var
  var _memoryShipmentsRegistry: Map<string, ShipmentRecord[]> | undefined;
}

const memoryShipments = globalThis._memoryShipmentsRegistry ?? new Map<string, ShipmentRecord[]>();
if (process.env.NODE_ENV !== "production") {
  globalThis._memoryShipmentsRegistry = memoryShipments;
}

export function buildCarrierTrackingUrl(carrier: string, trackingNumber: string): string {
  const norm = carrier.toLowerCase();
  if (norm.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
  }
  if (norm.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
  }
  if (norm.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(trackingNumber)}`;
  }
  if (norm.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
  }
  return `/track?carrier=${encodeURIComponent(carrier)}&num=${encodeURIComponent(trackingNumber)}`;
}

export class ShippingService {
  /**
   * Create or register a shipment for an order.
   */
  async createShipment(params: CreateShipmentParams): Promise<ShipmentRecord> {
    const shipmentId = `ship-${crypto.randomUUID()}`;
    const trackingUrl = params.trackingUrl || buildCarrierTrackingUrl(params.carrier, params.trackingNumber);

    const now = new Date();
    const record: ShipmentRecord = {
      id: shipmentId,
      orderId: params.orderId,
      carrier: params.carrier,
      serviceName: params.serviceName || "Standard Express Atelier Delivery",
      trackingNumber: params.trackingNumber,
      trackingUrl,
      status: "in_transit",
      shippingCost: params.shippingCost || 0,
      estimatedDeliveryDate: params.estimatedDeliveryDate || null,
      shippedAt: now.toISOString(),
      deliveredAt: null,
      notes: params.notes || null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Update in-memory registry
    const existing = memoryShipments.get(params.orderId) || [];
    existing.push(record);
    memoryShipments.set(params.orderId, existing);

    // Persist to Postgres
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db.insert(schema.shipments).values({
          id: shipmentId,
          orderId: params.orderId,
          carrier: params.carrier,
          serviceName: record.serviceName,
          trackingNumber: params.trackingNumber,
          trackingUrl,
          status: "in_transit",
          shippingCost: params.shippingCost ? params.shippingCost.toFixed(2) : "0.00",
          estimatedDeliveryDate: params.estimatedDeliveryDate ? new Date(params.estimatedDeliveryDate) : null,
          shippedAt: now,
          notes: params.notes || null,
        });

        if (params.items && params.items.length > 0) {
          for (const it of params.items) {
            await db.insert(schema.shipmentItems).values({
              shipmentId,
              orderItemId: it.orderItemId,
              quantity: it.quantity,
            });
          }
        }
      } catch (err) {
        console.warn("DB createShipment error, using memory fallback:", err);
      }
    }

    // Synchronize order fulfillment status to "shipped"
    await orderService.updateOrderFulfillmentStatus(params.orderId, "shipped");
    await orderService.updateOrderStatus(
      params.orderId,
      "processing",
      { type: "system" },
      `Dispatched with ${params.carrier} (Tracking: ${params.trackingNumber})`
    );

    return record;
  }

  /**
   * Update tracking status for an existing shipment.
   */
  async updateShipmentStatus(
    shipmentId: string,
    orderId: string,
    newStatus: ShipmentStatus
  ): Promise<boolean> {
    const list = memoryShipments.get(orderId) || [];
    const target = list.find((s) => s.id === shipmentId);
    const now = new Date();

    if (target) {
      target.status = newStatus;
      target.updatedAt = now.toISOString();
      if (newStatus === "delivered") {
        target.deliveredAt = now.toISOString();
      }
    }

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(schema.shipments)
          .set({
            status: newStatus,
            deliveredAt: newStatus === "delivered" ? now : undefined,
            updatedAt: now,
          })
          .where(eq(schema.shipments.id, shipmentId));
      } catch (err) {
        console.warn("DB updateShipmentStatus error:", err);
      }
    }

    // Sync order fulfillment status
    if (newStatus === "delivered") {
      await orderService.updateOrderFulfillmentStatus(orderId, "delivered");
      await orderService.updateOrderStatus(
        orderId,
        "completed",
        { type: "system" },
        "Commission safely delivered to client"
      );
    }

    return true;
  }

  /**
   * Retrieve all shipments for an order.
   */
  async getShipmentsByOrderId(orderId: string): Promise<ShipmentRecord[]> {
    const memList = memoryShipments.get(orderId) || [];

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(schema.shipments)
          .where(eq(schema.shipments.orderId, orderId))
          .orderBy(desc(schema.shipments.createdAt));

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            orderId: r.orderId,
            carrier: r.carrier,
            serviceName: r.serviceName,
            trackingNumber: r.trackingNumber || "",
            trackingUrl: r.trackingUrl,
            status: r.status as ShipmentStatus,
            shippingCost: r.shippingCost ? parseFloat(r.shippingCost) : null,
            estimatedDeliveryDate: r.estimatedDeliveryDate ? r.estimatedDeliveryDate.toISOString() : null,
            shippedAt: r.shippedAt ? r.shippedAt.toISOString() : null,
            deliveredAt: r.deliveredAt ? r.deliveredAt.toISOString() : null,
            notes: r.notes,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          }));
        }
      } catch (err) {
        console.warn("DB getShipmentsByOrderId error:", err);
      }
    }

    return memList;
  }

  /**
   * Return simulated tracking lifecycle details for customer display.
   */
  async getTrackingDetails(carrier: string, trackingNumber: string): Promise<TrackingDetails> {
    return {
      carrier,
      trackingNumber,
      status: "in_transit",
      estimatedDelivery: "2 business days",
      events: [
        {
          timestamp: new Date().toISOString(),
          status: "in_transit",
          description: "Departed sorting hub, en route to destination facility",
          location: "Central Distribution Center",
        },
        {
          timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
          status: "label_created",
          description: "Package received and origin scan completed",
          location: "Atelier Dispatch Center",
        },
      ],
    };
  }
}

export const shippingService = new ShippingService();
