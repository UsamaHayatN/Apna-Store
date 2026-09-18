/**
 * Shipping & Fulfillment Abstraction Types
 */

export type CarrierName = "FedEx" | "UPS" | "DHL" | "USPS" | "Atelier Courier" | "Royal Mail";

export type ShipmentStatus =
  | "pending"
  | "label_created"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "failed";

export interface CreateShipmentParams {
  orderId: string;
  carrier: CarrierName | string;
  serviceName?: string;
  trackingNumber: string;
  trackingUrl?: string;
  shippingCost?: number;
  estimatedDeliveryDate?: string;
  notes?: string;
  items?: Array<{
    orderItemId: string;
    quantity: number;
  }>;
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  carrier: string;
  serviceName?: string | null;
  trackingNumber: string;
  trackingUrl?: string | null;
  status: ShipmentStatus;
  shippingCost?: number | null;
  estimatedDeliveryDate?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingEvent {
  timestamp: string;
  status: ShipmentStatus;
  description: string;
  location?: string;
}

export interface TrackingDetails {
  trackingNumber: string;
  carrier: string;
  status: ShipmentStatus;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

export interface ShippingProvider {
  createShipment(params: CreateShipmentParams): Promise<ShipmentRecord>;
  trackShipment(trackingNumber: string, carrier: string): Promise<TrackingDetails>;
  cancelShipment(shipmentId: string): Promise<boolean>;
}
