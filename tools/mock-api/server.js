// Reference implementation of the Orders API contract (no dependencies, in-memory).
// Purpose: sanity-check the test suites on machines without PHP/MySQL. It is NOT the app under test.
//   node server.js                       -> all seeded bugs ON  (PORT=8000)
//   SEEDED_BUGS=false node server.js     -> correct behaviour
//   FIXED_BUGS=BUG-004,BUG-005 node ...  -> selectively fixed
const http = require('http');
const crypto = require('crypto');

const ENABLED = (process.env.SEEDED_BUGS || 'true') !== 'false';
const FIXED = (process.env.FIXED_BUGS || '').split(',').map((s) => s.trim()).filter(Boolean);
const bug = (id) => ENABLED && !FIXED.includes(id);
const PORT = Number(process.env.PORT || 8000);

const users = []; const tokens = new Map(); const orders = []; let uid = 0, oid = 0, iid = 0;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(code === 204 ? '' : JSON.stringify(body)); };
const invalid = (res, errors) => send(res, 422, { message: 'The given data was invalid.', errors });
const round2 = (n) => Math.round(n * 100) / 100;
const isInt = (v) => typeof v === 'number' ? Number.isInteger(v) : (typeof v === 'string' && /^-?\d+$/.test(v));
const isNum = (v) => typeof v === 'number' ? Number.isFinite(v) : (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)));

const api = (o) => ({ id: o.id, user_id: o.user_id, customer_name: o.customer_name, status: o.status, total: round2(o.total),
  payment_attempts: o.payment_attempts, items: o.items, paid_at: o.paid_at, shipped_at: o.shipped_at, created_at: o.created_at, updated_at: o.updated_at });

function validateOrder(b) {
  const e = {};
  if (typeof b.customer_name !== 'string' || !b.customer_name) e.customer_name = ['required'];
  else if (b.customer_name.length > 100 && !bug('BUG-009')) e.customer_name = ['too long'];
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 20) e.items = ['1-20 items required'];
  else b.items.forEach((i, n) => {
    if (typeof i.sku !== 'string' || !i.sku || i.sku.length > 32) e[`items.${n}.sku`] = ['invalid'];
    if (!isInt(i.quantity)) e[`items.${n}.quantity`] = ['integer'];
    else if (!bug('BUG-002') && (Number(i.quantity) < 1 || Number(i.quantity) > 1000)) e[`items.${n}.quantity`] = ['1-1000'];
    if (!isNum(i.unit_price) || Number(i.unit_price) < 0.01 || Number(i.unit_price) > 100000) e[`items.${n}.unit_price`] = ['0.01-100000'];
  });
  return e;
}

const server = http.createServer((req, res) => {
  let raw = ''; req.on('data', (c) => (raw += c)); req.on('end', () => {
    const url = new URL(req.url, 'http://x'); const path = url.pathname.replace(/^\/api/, ''); const m = req.method;
    let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { return send(res, 400, { message: 'bad json' }); }
    const now = () => new Date().toISOString();

    if (m === 'GET' && path === '/health') return send(res, 200, { status: 'ok' });
    if (m === 'POST' && path === '/register') {
      const e = {};
      if (!body.name) e.name = ['required'];
      if (!body.email) e.email = ['required']; else if (bug('BUG-001') ? false : !EMAIL_RE.test(body.email)) e.email = ['invalid'];
      else if (users.find((u) => u.email === body.email)) e.email = ['taken'];
      if (!body.password) e.password = ['required']; else if (body.password.length < 8) e.password = ['min 8'];
      if (Object.keys(e).length) return invalid(res, e);
      const u = { id: ++uid, name: body.name, email: body.email, password: body.password }; users.push(u);
      const t = crypto.randomUUID(); tokens.set(t, u.id);
      return send(res, 201, { user: { id: u.id, name: u.name, email: u.email }, token: t });
    }
    if (m === 'POST' && path === '/login') {
      if (!body.email || !body.password) return invalid(res, { email: ['required'] });
      const u = users.find((x) => x.email === body.email);
      if (!u && bug('BUG-008')) return send(res, 404, { message: 'No account found for this email' });
      if (!u || u.password !== body.password) return send(res, 401, { message: 'Invalid credentials' });
      const t = crypto.randomUUID(); tokens.set(t, u.id);
      return send(res, 200, { user: { id: u.id, name: u.name, email: u.email }, token: t });
    }

    const tok = (req.headers.authorization || '').replace(/^Bearer /, ''); const me = users.find((u) => u.id === tokens.get(tok));
    if (!me) return send(res, 401, { message: 'Unauthenticated.' });
    if (m === 'POST' && path === '/logout') { tokens.delete(tok); return send(res, 200, { message: 'Logged out' }); }
    if (m === 'GET' && path === '/me') return send(res, 200, { id: me.id, name: me.name, email: me.email });

    if (m === 'GET' && path === '/orders/stats') {
      const mine = orders.filter((o) => o.user_id === me.id); const by = { created: 0, paid: 0, shipped: 0, cancelled: 0 };
      mine.forEach((o) => by[o.status]++);
      return send(res, 200, { total_orders: mine.length, by_status: by, revenue: round2(mine.filter((o) => ['paid', 'shipped'].includes(o.status)).reduce((s, o) => s + o.total, 0)) });
    }
    if (m === 'GET' && path === '/orders') {
      // mirrors PHP: absent -> default, present -> (int) cast (non-numeric = 0) then clamped
      const q = (k, d) => { const v = url.searchParams.get(k); return v === null ? d : (parseInt(v, 10) || 0); };
      const page = Math.max(1, q('page', 1));
      const per = Math.min(100, Math.max(1, q('per_page', 10)));
      const mine = orders.filter((o) => o.user_id === me.id).sort((a, b) => b.id - a.id);
      let off = (page - 1) * per; if (page > 1 && bug('BUG-006')) off -= 1;
      return send(res, 200, { data: mine.slice(off, off + per).map(api), meta: { page, per_page: per, total: mine.length, last_page: Math.max(1, Math.ceil(mine.length / per)) } });
    }
    if (m === 'POST' && path === '/orders') {
      const e = validateOrder(body); if (Object.keys(e).length) return invalid(res, e);
      if (body.customer_name.length > 100) return send(res, 500, { message: 'Server Error' }); // BUG-009 (DB truncation)
      let total = 0;
      body.items.forEach((i) => { let line = Number(i.quantity) * Number(i.unit_price); if (Number(i.quantity) >= 10 && bug('BUG-007')) line *= 0.9; total += line; });
      const o = { id: ++oid, user_id: me.id, customer_name: body.customer_name, status: 'created', total: round2(total), payment_attempts: 0, paid_at: null, shipped_at: null, created_at: now(), updated_at: now(),
        items: body.items.map((i) => ({ id: ++iid, sku: i.sku, name: i.name || null, quantity: Number(i.quantity), unit_price: round2(Number(i.unit_price)) })) };
      orders.push(o); return send(res, 201, api(o));
    }
    const mm = path.match(/^\/orders\/(\d+)(?:\/(pay|ship|cancel))?$/);
    if (mm) {
      const o = orders.find((x) => x.id === Number(mm[1])); if (!o) return send(res, 404, { message: 'Order not found' });
      if (o.user_id !== me.id && !bug('BUG-003')) return send(res, 403, { message: 'Forbidden' });
      const act = mm[2]; const conflict = (s) => send(res, 409, { message: `Order cannot be ${s} from status "${o.status}"` });
      if (!act && m === 'GET') return send(res, 200, api(o));
      if (!act && m === 'PUT') {
        if (o.status !== 'created') return send(res, 409, { message: 'Only orders in "created" status can be edited' });
        if (!body.customer_name || body.customer_name.length > 100) return invalid(res, { customer_name: ['invalid'] });
        o.customer_name = body.customer_name; o.updated_at = now(); return send(res, 200, api(o));
      }
      if (!act && m === 'DELETE') {
        if (o.status !== 'created') return send(res, 409, { message: 'Only orders in "created" status can be deleted' });
        orders.splice(orders.indexOf(o), 1); return send(res, 204);
      }
      if (act === 'pay' && m === 'POST') {
        if (!(bug('BUG-004') ? ['created', 'paid'] : ['created']).includes(o.status)) return conflict('paid');
        o.status = 'paid'; o.paid_at = now(); o.payment_attempts++; return send(res, 200, api(o));
      }
      if (act === 'ship' && m === 'POST') {
        if (!(bug('BUG-005') ? ['created', 'paid'] : ['paid']).includes(o.status)) return conflict('shipped');
        o.status = 'shipped'; o.shipped_at = now(); return send(res, 200, api(o));
      }
      if (act === 'cancel' && m === 'POST') {
        if (!(bug('BUG-010') ? ['created', 'paid', 'shipped'] : ['created', 'paid']).includes(o.status)) return conflict('cancelled');
        o.status = 'cancelled'; return send(res, 200, api(o));
      }
    }
    send(res, 404, { message: 'Not found' });
  });
});
server.listen(PORT, () => console.log(`mock api on :${PORT} seeded=${ENABLED} fixed=[${FIXED}]`));
