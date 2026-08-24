import { api } from './client';
export type CheckoutSession = { id: string; cartId: string; status: string; currency: string; subtotal: number | string; discountTotal: number | string; shippingTotal: number | string; taxTotal: number | string; grandTotal: number | string; expiresAt: string; shippingMethod?: { name: string; estimatedDays: number; price: number | string } | null };
export const checkoutApi = {
  create: (body: { cartId: string; shippingAddressId: string; billingAddressId?: string }) => api.post<CheckoutSession>('/checkout/session', body),
  get: (id: string) => api.get<CheckoutSession>(`/checkout/session/${id}`),
  address: (body: { sessionId: string; addressId: string; billingAddressId?: string }) => api.post<CheckoutSession>('/checkout/address', body),
  shipping: (body: { sessionId: string; shippingMethodId: string }) => api.post<CheckoutSession>('/checkout/shipping-method', body),
  coupon: (body: { sessionId: string; code: string }) => api.post<CheckoutSession>('/checkout/apply-coupon', body),
  recalculate: (sessionId: string) => api.post<CheckoutSession>('/checkout/recalculate', { sessionId }),
  confirm: (sessionId: string) => api.post<CheckoutSession>('/checkout/confirm', { sessionId }),
};
