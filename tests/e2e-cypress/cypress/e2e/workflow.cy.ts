import { ordersPage } from '../pages/OrdersPage';

describe('Order workflow create > pay > ship @integration @regression', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.apiLogin().then(({ token }) => cy.apiOrder(token, 2, 25)).then(({ id }) => { cy.wrap(id).as('orderId'); });
    cy.visit('/');
  });

  it('pays and ships an order through the UI', function () {
    cy.get(`[data-testid=open-${this.orderId}]`).click();
    ordersPage.pay();
    ordersPage.status().should('have.text', 'paid');
    ordersPage.ship();
    ordersPage.status().should('have.text', 'shipped');
    cy.get('[data-testid=ship]').should('not.exist');
    cy.get('[data-testid=cancel]').should('not.exist');
  });

  it('cancelling removes the pay/ship actions', function () {
    cy.get(`[data-testid=open-${this.orderId}]`).click();
    ordersPage.cancel();
    ordersPage.status().should('have.text', 'cancelled');
    cy.get('[data-testid=pay]').should('not.exist');
  });

  it('Pay action is a real, keyboard-focusable button (BUG-014)', function () {
    cy.get(`[data-testid=open-${this.orderId}]`).click();
    cy.get('[data-testid=pay]').should('match', 'button');
    cy.get('[data-testid=pay]').focus().should('have.focus');
  });
});
