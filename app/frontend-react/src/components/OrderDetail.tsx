import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { SEEDED } from '../bugs';
import type { Order } from '../types';
import StatusBadge from './StatusBadge';

export default function OrderDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { api.order(id).then(setOrder).catch((e) => setError(e.message)); }, [id]);

  const act = async (a: 'pay' | 'ship' | 'cancel') => {
    setError('');
    try { setOrder(await api.action(id, a)); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Unexpected error'); }
  };

  if (error && !order) return <p role="alert" className="error">{error}</p>;
  if (!order) return <p>Loading…</p>;

  return (
    <section>
      <button onClick={onBack} data-testid="back">← Back to orders</button>
      <h2>Order #{order.id}</h2>
      <p>Customer: <span data-testid="customer-name">{order.customer_name}</span></p>
      <p>Status: <StatusBadge status={order.status} /></p>
      <p>Total: <strong data-testid="total">${order.total.toFixed(2)}</strong></p>
      <ul data-testid="items">
        {order.items.map((i, idx) => <li key={idx}>{i.sku} × {i.quantity} @ ${i.unit_price.toFixed(2)}</li>)}
      </ul>

      <div className="actions">
        {order.status === 'created' && (
          // BUG-014: a <div> with onClick is not focusable and has no button role -> keyboard users cannot pay
          SEEDED
            ? <div className="btn-like" data-testid="pay" onClick={() => act('pay')}>Pay</div>
            : <button data-testid="pay" onClick={() => act('pay')}>Pay</button>
        )}
        {order.status === 'paid' && <button data-testid="ship" onClick={() => act('ship')}>Ship</button>}
        {(order.status === 'created' || order.status === 'paid') && <button data-testid="cancel" onClick={() => act('cancel')}>Cancel order</button>}
      </div>
      {error && <p role="alert" className="error" data-testid="action-error">{error}</p>}
    </section>
  );
}
