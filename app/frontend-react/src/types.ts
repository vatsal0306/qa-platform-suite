export interface OrderItem { id?: number; sku: string; name?: string | null; quantity: number; unit_price: number }
export interface Order {
  id: number; user_id: number; customer_name: string;
  status: 'created' | 'paid' | 'shipped' | 'cancelled';
  total: number; payment_attempts: number; items: OrderItem[]; created_at: string;
}
export interface Page<T> { data: T[]; meta: { page: number; per_page: number; total: number; last_page: number } }
export interface User { id: number; name: string; email: string }
