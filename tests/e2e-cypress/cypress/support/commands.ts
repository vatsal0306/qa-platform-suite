/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /** Registers a fresh user through the API and stores the token like the UI does. */
      apiLogin(): Chainable<{ token: string; email: string }>;
      /** Creates an order through the API for the given token. */
      apiOrder(token: string, qty?: number, price?: number): Chainable<{ id: number }>;
    }
  }
}

Cypress.Commands.add('apiLogin', () => {
  const email = `cy_${Date.now()}_${Cypress._.random(0, 9999)}@example.com`;
  return cy.request({ method: 'POST', url: `${Cypress.env('apiUrl')}/register`, headers: { Accept: 'application/json' },
    body: { name: 'Cypress', email, password: 'Password123!' } }).then((res) => {
    window.localStorage.setItem('token', res.body.token);
    return { token: res.body.token as string, email };
  });
});

Cypress.Commands.add('apiOrder', (token: string, qty = 2, price = 10) =>
  cy.request({
    method: 'POST', url: `${Cypress.env('apiUrl')}/orders`, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: { customer_name: 'Cypress Corp', items: [{ sku: 'SKU-1', quantity: qty, unit_price: price }] },
  }).then((r) => ({ id: r.body.id as number })),
);

export {};
