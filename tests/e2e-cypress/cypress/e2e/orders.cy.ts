import { ordersPage } from '../pages/OrdersPage';

describe('Orders @regression @functional', () => {
  beforeEach(() => { cy.clearLocalStorage(); cy.apiLogin(); cy.visit('/'); });

  it('shows the empty state for a new user', () => {
    cy.get('[data-testid=empty]').should('contain', 'No orders yet');
  });

  it('creates an order and shows the correct total', () => {
    ordersPage.openNew().fillOrder('Acme', 'SKU-9', 3, 19.99).create();
    ordersPage.total().should('have.text', '$59.97');
    ordersPage.status().should('have.text', 'created');
  });

  it('bulk order total has no hidden discount (BUG-007)', () => {
    ordersPage.openNew().fillOrder('Bulk', 'SKU-B', 10, 100).create();
    ordersPage.total().should('have.text', '$1000.00');
  });

  it('shows a server validation error for quantity 0 (BUG-002)', () => {
    cy.intercept('POST', '**/api/orders').as('create');
    ordersPage.openNew().fillOrder('Acme', 'SKU-9', 0, 10).create();
    cy.wait('@create').its('response.statusCode').should('eq', 422);
    cy.get('[data-testid=form-errors]').should('be.visible');
  });

  it('shows a validation error, not a crash, for a 101-char name (BUG-009)', () => {
    cy.intercept('POST', '**/api/orders').as('create');
    ordersPage.openNew().fillOrder('a'.repeat(101), 'SKU-9', 1, 10).create();
    cy.wait('@create').its('response.statusCode').should('eq', 422); // a 500 would also show *an* error banner
    cy.get('[data-testid=form-errors]').should('be.visible');
  });

  it('paginates without repeating rows (BUG-006)', () => {
    cy.apiLogin().then(({ token }) => {
      for (let i = 0; i < 12; i++) cy.apiOrder(token, 1, i + 1);
      cy.visit('/');
      cy.get('[data-testid=order-row]').should('have.length', 10);
      cy.get('[data-testid=order-row] td:first-child').then(($p1) => {
        const first = [...$p1].map((e) => e.textContent);
        cy.get('[data-testid=next]').click();
        cy.get('[data-testid=page-info]').should('contain', 'Page 2');
        cy.get('[data-testid=order-row] td:first-child').then(($p2) => {
          const second = [...$p2].map((e) => e.textContent);
          expect(second.filter((id) => first.includes(id)), 'ids repeated across pages').to.have.length(0);
        });
      });
    });
  });
});
