type ApiEnvelope<T> = { success: boolean; data: T; meta: { timestamp: string } };
import { tokenStore } from './client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function catalogFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const accessToken = tokenStore.get();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...init, headers });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | { message?: string; error?: { message?: string | string[] } } | null;
  if (!response.ok) {
    const message = payload && 'error' in payload ? payload.error?.message : payload && 'message' in payload ? payload.message : undefined;
    throw new Error(Array.isArray(message) ? message.join(', ') : message || `Catalog request failed (${response.status})`);
  }
  return (payload as ApiEnvelope<T>).data;
}
