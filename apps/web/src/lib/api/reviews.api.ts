import { api } from './client';

export type Review = { id: string; rating: number; title: string; comment: string; status: string; createdAt: string; user?: { firstName?: string | null; lastName?: string | null } };
export const reviewsApi = {
  list: (productId: string) => api.get<Review[]>(`/products/${productId}/reviews`),
  create: (productId: string, body: { orderId: string; rating: number; title: string; comment: string }) => api.post<Review>(`/products/${productId}/reviews`, body),
};
