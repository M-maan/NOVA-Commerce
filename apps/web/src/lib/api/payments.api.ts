import { api } from './client';
export type Payment = { id: string; status: string; amount: number | string; currency: string; providerPaymentId?: string | null };
export const paymentsApi = { createIntent: (checkoutSessionId: string) => api.post<{ payment: Payment; clientSecret?: string }>('/payments/create-intent', { checkoutSessionId }), status: (id: string) => api.get<Payment>(`/payments/${id}/status`), retry: (id: string) => api.post<{ payment: Payment; clientSecret?: string }>(`/payments/${id}/retry`) };
