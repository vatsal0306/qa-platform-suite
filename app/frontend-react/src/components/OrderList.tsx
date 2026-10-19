import { useEffect, useState } from 'react';
import { api } from '../api';
import { SEEDED } from '../bugs';
import type { Order, Page } from '../types';
import StatusBadge from './StatusBadge';

export default function OrderList({ onOpen }: { onOpen: (id: number) => void }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Order> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.orders(page, 10).then(setData).catch((e) => setError(e.message));
  }, [page]);

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  // BUG-013: table has a fixed min-width and no scroll wrapper -> horizontal page scroll on phones
  const table = (
    <table className={SEEDED ? 'orders table-fixed-bug' : 'orders'} data-testid="orders-table">
      <caption className="sr-only">Your orders</caption>
      <thead>
        <tr>
          <th scope="col">ID</th><th scope="col">Customer</th><th scope="col">Status</th>
          <th scope="col">Items</th><th scope="col">Total</th><th scope="col"><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {data.data.map((o) => (
          <tr key={o.id} data-testid="order-row">
            <td>{o.id}</td>
            <td>{o.customer_name}</td>
            <td><StatusBadge status={o.status} /></td>
            <td>{o.items.length}</td>
            <td>${o.total.toFixed(2)}</td>
            <td><button onClick={() => onOpen(o.id)} data-testid={`open-${o.id}`}>View<span className="sr-only"> order {o.id}</span></button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <section>
      <h2>Orders ({data.meta.total})</h2>
      {data.data.length === 0 && <p data-testid="empty">No orders yet.</p>}
      {data.data.length > 0 && (SEEDED ? table : <div className="table-wrap">{table}</div>)}
      <div className="pager">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="prev">Previous</button>
        <span data-testid="page-info">Page {data.meta.page} of {data.meta.last_page}</span>
        <button disabled={page >= data.meta.last_page} onClick={() => setPage(page + 1)} data-testid="next">Next</button>
      </div>
    </section>
  );
}
