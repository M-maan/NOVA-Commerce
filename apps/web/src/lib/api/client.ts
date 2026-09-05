type ApiEnvelope<T> = { success: boolean; data: T; meta: { timestamp: string } };

const ACCESS_TOKEN_KEY = 'nova-access-token';

// Keep the access token across page refreshes while remaining SSR-safe.
let accessToken: string | null = typeof window !== 'undefined'
  ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
  : null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
      else window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },
};

export class ApiClient {
  constructor(private readonly baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1') {}

  async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...init, headers, credentials: 'include' });
    } catch {
      throw new Error('Unable to connect to the server. Please try again in a moment.');
    }
    if (response.status === 401 && retry && path !== '/auth/refresh') {
      try {
        const refreshed = await this.request<{ accessToken: string }>('/auth/refresh', { method: 'POST', body: JSON.stringify({}) }, false);
        tokenStore.set(refreshed.accessToken);
        return this.request<T>(path, init, false);
      } catch {
        tokenStore.set(null);
      }
    }
    const payload = await response.json().catch(() => null) as ApiEnvelope<T> | { message?: string; error?: { message?: string | string[] } } | null;
    if (!response.ok) {
      const nestedMessage = payload && 'error' in payload ? payload.error?.message : undefined;
      const rawMessage = payload && 'message' in payload ? payload.message : nestedMessage;
      const detailMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      const message = response.status === 409
        ? 'An account with this email or phone already exists. Please use different details or log in.'
        : detailMessage
          ? detailMessage
          : 'Request could not be completed. Please try again.';
      throw new Error(message ?? `API request failed (${response.status})`);
    }
    return (payload as ApiEnvelope<T>).data;
  }

  get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body ?? {}) });
  }

  upload<T>(path: string, form: FormData): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: form });
  }

  patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(body ?? {}) });
  }

  delete<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: 'DELETE' });
  }
}

export const api = new ApiClient();
