import type { Order, Page, User } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) { super(message); }
}

const tokenKey = 'token';
export const getToken = () => localStorage.getItem(tokenKey);
export const setToken = (t: string | null) => (t ? localStorage.setItem(tokenKey, t) : localStorage.removeItem(tokenKey));

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.message || 'Request failed', body.errors);
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    request<{ user: User; token: string }>('/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  logout: () => request('/logout', { method: 'POST' }),
  orders: (page = 1, perPage = 10) => request<Page<Order>>(`/orders?page=${page}&per_page=${perPage}`),
  order: (id: number) => request<Order>(`/orders/${id}`),
  createOrder: (customer_name: string, items: { sku: string; quantity: number; unit_price: number }[]) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify({ customer_name, items }) }),
  action: (id: number, action: 'pay' | 'ship' | 'cancel') => request<Order>(`/orders/${id}/${action}`, { method: 'POST' }),
  remove: (id: number) => request<void>(`/orders/${id}`, { method: 'DELETE' }),
};
