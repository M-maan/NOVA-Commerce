import { catalogFetch } from './catalog-client';
export type ShippingMethod = { id: string; name: string; code: string; description?: string | null; price: number | string; estimatedDays: number };
export const shippingApi = { list: () => catalogFetch<ShippingMethod[]>('/shipping-methods') };
