import { api } from './client';

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  grandTotal: string;
  placedAt: string;
  cancelledAt?: string | null;
  items: Array<{ id: string; productNameSnapshot: string; variantNameSnapshot?: string | null; skuSnapshot?: string | null; imageSnapshot?: string | null; unitPrice: string; quantity: number; lineTotal: string }>;
  statusHistory: Array<{ previousStatus?: string | null; newStatus: string; reason?: string | null; createdAt: string }>;
  shipments: Array<{ carrier: string; trackingNumber?: string | null; trackingUrl?: string | null; status: string; shippedAt?: string | null; deliveredAt?: string | null }>;
  returnRequests: Array<{ id: string; status: string; reason: string; notes?: string | null; requestedAt: string }>;
  refunds: Array<{ id: string; amount: string; reason: string; status: string; createdAt: string }>;
};

export const ordersApi = {
  list: () => api.get<Order[]>('/orders'),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  invoice: (id: string) => api.get<Record<string, unknown>>(`/orders/${id}/invoice`),
  cancel: (id: string, reason?: string) => api.post<Order>(`/orders/${id}/cancel`, { reason }),
  requestReturn: (id: string, reason: string, notes?: string) => api.post(`/orders/${id}/returns`, { reason, notes }),
  returns: (id: string) => api.get(`/orders/${id}/returns`),
};
