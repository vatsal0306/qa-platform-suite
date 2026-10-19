import { useState } from 'react';
import { api, getToken, setToken } from './api';
import Login from './components/Login';
import OrderList from './components/OrderList';
import OrderForm from './components/OrderForm';
import OrderDetail from './components/OrderDetail';

type View = { name: 'list' } | { name: 'new' } | { name: 'detail'; id: number };

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [view, setView] = useState<View>({ name: 'list' });

  if (!authed) return <main><Login onAuth={() => setAuthed(true)} /></main>;

  const logout = async () => {
    try { await api.logout(); } catch { /* token may already be invalid */ }
    setToken(null);
    setAuthed(false);
  };

  return (
    <>
      <header className="topbar">
        <h1>QA Orders</h1>
        <nav aria-label="Main">
          <button onClick={() => setView({ name: 'list' })} data-testid="nav-orders">Orders</button>
          <button onClick={() => setView({ name: 'new' })} data-testid="nav-new">New order</button>
          <button onClick={logout} data-testid="logout">Log out</button>
        </nav>
      </header>
      <main>
        {view.name === 'list' && <OrderList onOpen={(id) => setView({ name: 'detail', id })} />}
        {view.name === 'new' && <OrderForm onCreated={(id) => setView({ name: 'detail', id })} />}
        {view.name === 'detail' && <OrderDetail id={view.id} onBack={() => setView({ name: 'list' })} />}
      </main>
    </>
  );
}
