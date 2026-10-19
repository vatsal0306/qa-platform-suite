import { FormEvent, useState } from 'react';
import { api, ApiError } from '../api';

interface Line { sku: string; quantity: string; unit_price: string }
const blank = (): Line => ({ sku: '', quantity: '1', unit_price: '' });

export default function OrderForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [customer, setCustomer] = useState('');
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [errors, setErrors] = useState<string[]>([]);

  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    try {
      const order = await api.createOrder(
        customer,
        lines.map((l) => ({ sku: l.sku, quantity: Number(l.quantity), unit_price: Number(l.unit_price) })),
      );
      onCreated(order.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ? Object.values(err.errors).flat() : [err.message]);
      } else setErrors(['Unexpected error']);
    }
  };

  return (
    <form onSubmit={submit} className="card" aria-labelledby="new-title" noValidate>
      <h2 id="new-title">New order</h2>
      <label htmlFor="customer">Customer name</label>
      <input id="customer" data-testid="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} />

      {lines.map((l, i) => (
        <fieldset key={i} className="line">
          <legend>Item {i + 1}</legend>
          <label htmlFor={`sku-${i}`}>SKU</label>
          <input id={`sku-${i}`} data-testid={`sku-${i}`} value={l.sku} onChange={(e) => setLine(i, { sku: e.target.value })} />
          <label htmlFor={`qty-${i}`}>Quantity</label>
          <input id={`qty-${i}`} data-testid={`qty-${i}`} type="number" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
          <label htmlFor={`price-${i}`}>Unit price</label>
          <input id={`price-${i}`} data-testid={`price-${i}`} type="number" step="0.01" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} />
          {lines.length > 1 && <button type="button" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>Remove item {i + 1}</button>}
        </fieldset>
      ))}
      <button type="button" onClick={() => setLines([...lines, blank()])} data-testid="add-line">Add item</button>

      {errors.length > 0 && (
        <ul role="alert" className="error" data-testid="form-errors">{errors.map((m, i) => <li key={i}>{m}</li>)}</ul>
      )}
      <button type="submit" data-testid="create-order">Create order</button>
    </form>
  );
}
