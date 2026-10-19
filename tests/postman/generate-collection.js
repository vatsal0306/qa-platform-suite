// Generates qa-orders.postman_collection.json  ->  node generate-collection.js
// Keeping the collection as code makes diffs reviewable and avoids hand-editing JSON.
const fs = require('fs');

const folders = [];
let current;
const folder = (name) => { current = { name, item: [] }; folders.push(current); };

/**
 * req(name, method, path, opts)
 *  opts.auth:  'A' | 'B'      -> bearer token variable
 *  opts.body:  object|string  -> JSON body (strings may contain {{vars}})
 *  opts.pre:   string         -> pre-request script
 *  opts.tests: string[]       -> test script lines
 *  opts.headers: [{key,value}]
 */
function req(name, method, path, opts = {}) {
  const header = [{ key: 'Accept', value: 'application/json' }, ...(opts.headers || [])];
  if (opts.body !== undefined) header.push({ key: 'Content-Type', value: 'application/json' });
  const [p, q = ''] = path.split('?');
  const item = {
    name,
    request: {
      method, header,
      url: {
        raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: p.replace(/^\//, '').split('/'),
        query: q.split('&').filter(Boolean).map((kv) => ({ key: kv.split('=')[0], value: kv.split('=')[1] })),
      },
    },
    event: [],
  };
  if (opts.auth) item.request.auth = { type: 'bearer', bearer: [{ key: 'token', value: `{{token${opts.auth}}}`, type: 'string' }] };
  if (opts.body !== undefined) item.request.body = { mode: 'raw', raw: typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body, null, 2), options: { raw: { language: 'json' } } };
  if (opts.pre) item.event.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: opts.pre.split('\n') } });
  if (opts.tests) item.event.push({ listen: 'test', script: { type: 'text/javascript', exec: opts.tests.join('\n').split('\n') } });
  current.item.push(item);
}

const status = (code) => `pm.test('Status is ${code}', () => pm.response.to.have.status(${code}));`;
const fast = `pm.test('Response time < 1500ms', () => pm.expect(pm.response.responseTime).to.be.below(1500));`;
const json = `const body = pm.response.json();`;
const order = (qty = 2, price = 10.5, name = 'Acme Corp') => ({ customer_name: name, items: [{ sku: 'SKU-1', name: 'Widget', quantity: qty, unit_price: price }] });

folder('00 Setup');
req('Health check', 'GET', '/api/health', { tests: [status(200), `pm.test('status ok', () => pm.expect(pm.response.json().status).to.eql('ok'));`] });
req('Register user A', 'POST', '/api/register', {
  pre: `const r = Date.now() + '' + Math.floor(Math.random()*1000);
pm.collectionVariables.set('emailA', 'usera_' + r + '@example.com');
pm.collectionVariables.set('emailB', 'userb_' + r + '@example.com');`,
  body: { name: 'User A', email: '{{emailA}}', password: 'Password123!' },
  tests: [status(201), json, `pm.test('returns token + user', () => { pm.expect(body.token).to.be.a('string'); pm.expect(body.user.email).to.eql(pm.collectionVariables.get('emailA')); });`,
    `pm.collectionVariables.set('tokenA', body.token);`, `pm.test('password never returned', () => pm.expect(JSON.stringify(body)).to.not.include('password'));`],
});
req('Register user B', 'POST', '/api/register', { body: { name: 'User B', email: '{{emailB}}', password: 'Password123!' }, tests: [status(201), json, `pm.collectionVariables.set('tokenB', body.token);`] });

folder('01 Auth - positive');
req('Login with valid credentials', 'POST', '/api/login', { body: { email: '{{emailA}}', password: 'Password123!' }, tests: [status(200), fast, json, `pm.test('token issued', () => pm.expect(body.token).to.be.a('string').and.not.empty);`] });
req('GET /me with token', 'GET', '/api/me', { auth: 'A', tests: [status(200), json, `pm.test('own profile', () => pm.expect(body.email).to.eql(pm.collectionVariables.get('emailA')));`] });

folder('02 Auth - negative & boundary');
req('Register duplicate email -> 422', 'POST', '/api/register', { body: { name: 'Dup', email: '{{emailA}}', password: 'Password123!' }, tests: [status(422)] });
// The value must be unique per run: with a fixed value, BUG-001 lets it be registered once, and every later run gets a
// 422 "already taken" instead, so the test would pass for the wrong reason. The second assertion guards against that too.
req('Register invalid email format -> 422 (BUG-001)', 'POST', '/api/register', { body: { name: 'Bad', email: 'not-an-email-{{$timestamp}}', password: 'Password123!' },
  tests: [status(422), json, `pm.test('rejected for its format, not because it already exists', () => pm.expect(JSON.stringify((body.errors || {}).email || '')).to.not.include('taken'));`] });
req('Register password 7 chars -> 422 (boundary)', 'POST', '/api/register', { body: { name: 'Short', email: 'short_{{$timestamp}}@example.com', password: '1234567' }, tests: [status(422)] });
req('Register password 8 chars -> 201 (boundary)', 'POST', '/api/register', { body: { name: 'Eight', email: 'eight_{{$timestamp}}@example.com', password: '12345678' }, tests: [status(201)] });
req('Register missing fields -> 422', 'POST', '/api/register', { body: {}, tests: [status(422), json, `pm.test('field errors listed', () => pm.expect(Object.keys(body.errors)).to.include.members(['name','email','password']));`] });
req('Login wrong password -> 401', 'POST', '/api/login', { body: { email: '{{emailA}}', password: 'WrongPass1!' }, tests: [status(401)] });
req('Login unknown email -> 401, same as wrong password (BUG-008)', 'POST', '/api/login', { body: { email: 'nobody_{{$timestamp}}@example.com', password: 'Password123!' }, tests: [status(401), json, `pm.test('generic message', () => pm.expect(body.message).to.eql('Invalid credentials'));`] });
req('Login empty body -> 422', 'POST', '/api/login', { body: {}, tests: [status(422)] });
req('GET /me without token -> 401', 'GET', '/api/me', { tests: [status(401)] });
req('GET /me with garbage token -> 401', 'GET', '/api/me', { headers: [{ key: 'Authorization', value: 'Bearer garbage.token.value' }], tests: [status(401)] });
req('SQL injection string in login is handled safely', 'POST', '/api/login', { body: { email: "' OR '1'='1", password: 'x' }, tests: [`pm.test('no 5xx and no token', () => { pm.expect(pm.response.code).to.be.oneOf([401, 404, 422]); pm.expect(pm.response.text()).to.not.include('token'); });`] });

folder('03 Orders - create (positive)');
req('Create order', 'POST', '/api/orders', { auth: 'A', body: order(2, 10.5),
  tests: [status(201), fast, json, `pm.test('status created', () => pm.expect(body.status).to.eql('created'));`, `pm.test('total = qty * price', () => pm.expect(body.total).to.eql(21));`,
    `pm.test('item persisted', () => pm.expect(body.items).to.have.length(1));`, `pm.collectionVariables.set('orderId', body.id);`] });
req('Create multi-item order and verify total', 'POST', '/api/orders', { auth: 'A', body: { customer_name: 'Multi', items: [{ sku: 'A', quantity: 3, unit_price: 9.99 }, { sku: 'B', quantity: 1, unit_price: 0.01 }] },
  tests: [status(201), json, `pm.test('total 29.98', () => pm.expect(body.total).to.eql(29.98));`] });
req('Bulk order (qty 10) has no hidden discount (BUG-007)', 'POST', '/api/orders', { auth: 'A', body: order(10, 100), tests: [status(201), json, `pm.test('total 1000.00', () => pm.expect(body.total).to.eql(1000));`] });

folder('04 Orders - create (negative & boundary)');
req('No token -> 401', 'POST', '/api/orders', { body: order(), tests: [status(401)] });
req('Missing customer_name -> 422', 'POST', '/api/orders', { auth: 'A', body: { items: [{ sku: 'A', quantity: 1, unit_price: 1 }] }, tests: [status(422)] });
req('Empty items -> 422', 'POST', '/api/orders', { auth: 'A', body: { customer_name: 'X', items: [] }, tests: [status(422)] });
req('Quantity 0 -> 422 (boundary, BUG-002)', 'POST', '/api/orders', { auth: 'A', body: order(0, 5), tests: [status(422)] });
req('Quantity -5 -> 422 (BUG-002)', 'POST', '/api/orders', { auth: 'A', body: order(-5, 5), tests: [status(422)] });
req('Quantity 1000 -> 201 (upper boundary)', 'POST', '/api/orders', { auth: 'A', body: order(1000, 1), tests: [status(201)] });
req('Quantity 1001 -> 422 (upper boundary + 1, BUG-002)', 'POST', '/api/orders', { auth: 'A', body: order(1001, 1), tests: [status(422)] });
req('Quantity "abc" -> 422', 'POST', '/api/orders', { auth: 'A', body: { customer_name: 'X', items: [{ sku: 'A', quantity: 'abc', unit_price: 1 }] }, tests: [status(422)] });
req('Unit price 0 -> 422', 'POST', '/api/orders', { auth: 'A', body: order(1, 0), tests: [status(422)] });
req('Unit price 0.01 -> 201 (lower boundary)', 'POST', '/api/orders', { auth: 'A', body: order(1, 0.01), tests: [status(201)] });
req('customer_name 100 chars -> 201 (boundary)', 'POST', '/api/orders', { auth: 'A', body: order(1, 1, 'a'.repeat(100)), tests: [status(201)] });
req('customer_name 101 chars -> 422, not 500 (BUG-009)', 'POST', '/api/orders', { auth: 'A', body: order(1, 1, 'a'.repeat(101)), tests: [status(422)] });
req('21 items -> 422 (max 20)', 'POST', '/api/orders', { auth: 'A', body: { customer_name: 'X', items: Array.from({ length: 21 }, (_, i) => ({ sku: 'S' + i, quantity: 1, unit_price: 1 })) }, tests: [status(422)] });
req('XSS payload is returned as JSON text, never as HTML', 'POST', '/api/orders', { auth: 'A', body: order(1, 1, '<script>alert(1)</script>'), tests: [`pm.test('JSON content-type', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));`] });

folder('05 Orders - read, update, list');
req('Get own order', 'GET', '/api/orders/{{orderId}}', { auth: 'A', tests: [status(200), json, `pm.test('id matches', () => pm.expect(String(body.id)).to.eql(String(pm.collectionVariables.get('orderId'))));`] });
req('Get non-existent order -> 404', 'GET', '/api/orders/99999999', { auth: 'A', tests: [status(404)] });
req('Get order id "abc" -> 404', 'GET', '/api/orders/abc', { auth: 'A', tests: [status(404)] });
req('User B cannot read user A order -> 403 (BUG-003)', 'GET', '/api/orders/{{orderId}}', { auth: 'B', tests: [status(403)] });
req('Update customer name', 'PUT', '/api/orders/{{orderId}}', { auth: 'A', body: { customer_name: 'Renamed Corp' }, tests: [status(200), json, `pm.test('name updated', () => pm.expect(body.customer_name).to.eql('Renamed Corp'));`] });
req('User B cannot update user A order -> 403 (BUG-003)', 'PUT', '/api/orders/{{orderId}}', { auth: 'B', body: { customer_name: 'Hacked' }, tests: [status(403)] });
req('List orders (default pagination)', 'GET', '/api/orders', { auth: 'A', tests: [status(200), json, `pm.test('shape', () => { pm.expect(body.data).to.be.an('array'); pm.expect(body.meta).to.have.all.keys('page','per_page','total','last_page'); });`,
  `pm.test('only own orders', () => body.data.forEach(o => pm.expect(o.user_id).to.eql(body.data[0].user_id)));`] });
req('User B list is empty (isolation)', 'GET', '/api/orders', { auth: 'B', tests: [status(200), json, `pm.test('no orders for B', () => pm.expect(body.meta.total).to.eql(0));`] });
req('Pagination page 1', 'GET', '/api/orders?page=1&per_page=2', { auth: 'A', tests: [status(200), json, `pm.collectionVariables.set('page1Ids', JSON.stringify(body.data.map(o => o.id)));`] });
req('Pagination page 2 has no overlap with page 1 (BUG-006)', 'GET', '/api/orders?page=2&per_page=2', { auth: 'A', tests: [status(200), json,
  `const p1 = JSON.parse(pm.collectionVariables.get('page1Ids'));
pm.test('no duplicate ids across pages', () => body.data.forEach(o => pm.expect(p1).to.not.include(o.id)));`] });
req('per_page above max is capped at 100', 'GET', '/api/orders?per_page=5000', { auth: 'A', tests: [status(200), json, `pm.test('capped', () => pm.expect(body.meta.per_page).to.eql(100));`] });

folder('06 Workflow - create > pay > ship (happy path)');
req('Create workflow order', 'POST', '/api/orders', { auth: 'A', body: order(1, 50), tests: [status(201), json, `pm.collectionVariables.set('wfId', body.id);`] });
req('Pay order', 'POST', '/api/orders/{{wfId}}/pay', { auth: 'A', tests: [status(200), json, `pm.test('status paid', () => pm.expect(body.status).to.eql('paid'));`, `pm.test('one payment attempt', () => pm.expect(body.payment_attempts).to.eql(1));`] });
req('Edit paid order -> 409', 'PUT', '/api/orders/{{wfId}}', { auth: 'A', body: { customer_name: 'Late edit' }, tests: [status(409)] });
req('Delete paid order -> 409', 'DELETE', '/api/orders/{{wfId}}', { auth: 'A', tests: [status(409)] });
req('User B cannot pay user A order -> 403 (BUG-003)', 'POST', '/api/orders/{{wfId}}/pay', { auth: 'B', tests: [status(403)] });
req('Ship paid order', 'POST', '/api/orders/{{wfId}}/ship', { auth: 'A', tests: [status(200), json, `pm.test('status shipped', () => pm.expect(body.status).to.eql('shipped'));`, `pm.test('shipped_at set', () => pm.expect(body.shipped_at).to.be.a('string'));`] });
req('Pay shipped order -> 409', 'POST', '/api/orders/{{wfId}}/pay', { auth: 'A', tests: [status(409)] });

// Each state-machine probe below uses its own order, so one seeded bug fails one request (no cascades).
folder('06b Workflow - illegal transitions (one order per probe)');
req('Create order: ship-before-pay probe', 'POST', '/api/orders', { auth: 'A', body: order(1, 5), tests: [status(201), json, `pm.collectionVariables.set('probeShipId', body.id);`] });
req('Ship before pay -> 409 (BUG-005)', 'POST', '/api/orders/{{probeShipId}}/ship', { auth: 'A', tests: [status(409)] });
req('Create order: double-pay probe', 'POST', '/api/orders', { auth: 'A', body: order(1, 5), tests: [status(201), json, `pm.collectionVariables.set('probePayId', body.id);`] });
req('Pay once', 'POST', '/api/orders/{{probePayId}}/pay', { auth: 'A', tests: [status(200)] });
req('Pay again -> 409, no double charge (BUG-004)', 'POST', '/api/orders/{{probePayId}}/pay', { auth: 'A', tests: [status(409)] });
req('Create order: cancel-after-ship probe', 'POST', '/api/orders', { auth: 'A', body: order(1, 5), tests: [status(201), json, `pm.collectionVariables.set('probeCancelId', body.id);`] });
req('Pay (cancel probe)', 'POST', '/api/orders/{{probeCancelId}}/pay', { auth: 'A', tests: [status(200)] });
req('Ship (cancel probe)', 'POST', '/api/orders/{{probeCancelId}}/ship', { auth: 'A', tests: [status(200)] });
req('Cancel shipped order -> 409 (BUG-010)', 'POST', '/api/orders/{{probeCancelId}}/cancel', { auth: 'A', tests: [status(409)] });

folder('07 Workflow - cancel & delete');
req('Create order to cancel', 'POST', '/api/orders', { auth: 'A', body: order(1, 5), tests: [status(201), json, `pm.collectionVariables.set('cancelId', body.id);`] });
req('Cancel created order', 'POST', '/api/orders/{{cancelId}}/cancel', { auth: 'A', tests: [status(200), json, `pm.test('cancelled', () => pm.expect(body.status).to.eql('cancelled'));`] });
req('Pay cancelled order -> 409', 'POST', '/api/orders/{{cancelId}}/pay', { auth: 'A', tests: [status(409)] });
req('Create order to delete', 'POST', '/api/orders', { auth: 'A', body: order(1, 5), tests: [status(201), json, `pm.collectionVariables.set('deleteId', body.id);`] });
req('Delete created order -> 204', 'DELETE', '/api/orders/{{deleteId}}', { auth: 'A', tests: [status(204)] });
req('Deleted order is gone -> 404', 'GET', '/api/orders/{{deleteId}}', { auth: 'A', tests: [status(404)] });

folder('08 Stats (TDD endpoint)');
req('Stats reflect order states and revenue', 'GET', '/api/orders/stats', { auth: 'A', tests: [status(200), json,
  `pm.test('shape', () => { pm.expect(body).to.have.keys('total_orders','by_status','revenue'); pm.expect(body.by_status).to.have.all.keys('created','paid','shipped','cancelled'); });`,
  `pm.test('counts add up', () => pm.expect(Object.values(body.by_status).reduce((a,b)=>a+b,0)).to.eql(body.total_orders));`,
  `pm.test('revenue counts paid+shipped (>= 50 from workflow order)', () => pm.expect(body.revenue).to.be.at.least(50));`] });
req('Stats without token -> 401', 'GET', '/api/orders/stats', { tests: [status(401)] });

folder('09 Logout');
req('Logout', 'POST', '/api/logout', { auth: 'A', tests: [status(200)] });
req('Token is rejected after logout -> 401', 'GET', '/api/me', { auth: 'A', tests: [status(401)] });

fs.writeFileSync(__dirname + '/qa-orders.postman_collection.json', JSON.stringify({
  info: { name: 'QA Orders API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
          description: 'Functional, integration, negative, boundary and security checks. Request names reference seeded bug IDs.' },
  item: folders, variable: [{ key: 'baseUrl', value: 'http://localhost:8000' }],
}, null, 2));
fs.writeFileSync(__dirname + '/local.postman_environment.json', JSON.stringify({
  name: 'local', values: [{ key: 'baseUrl', value: 'http://localhost:8000', enabled: true }], _postman_variable_scope: 'environment' }, null, 2));
console.log('requests:', folders.reduce((n, f) => n + f.item.length, 0));
