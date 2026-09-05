import { api } from './client';
export type Payment = { id: string; status: string; amount: number | string; currency: string; providerPaymentId?: string | null; failureReason?: string | null; order?: { id: string; orderNumber: string; status: string } | null };
export type PaymentIntentResponse = { payment: Payment; clientSecret?: string; publishableKey?: string };
export const paymentsApi = {
  createIntent: (checkoutSessionId: string) => api.post<PaymentIntentResponse>('/payments/create-intent', { checkoutSessionId }),
  status: (id: string) => api.get<Payment>(`/payments/${id}/status`),
  checkoutStatus: (sessionId: string) => api.get<Payment>(`/payments/checkout/${sessionId}/status`),
  retry: (id: string) => api.post<PaymentIntentResponse>(`/payments/${id}/retry`),
};
