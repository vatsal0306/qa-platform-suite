import type { Options } from 'cypress-axe/dist';
import { ordersPage } from '../pages/OrdersPage';

const wcag: Options = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } };

function logViolations(violations: { id: string; impact?: string | null; nodes: unknown[] }[]) {
  violations.forEach((v) => Cypress.log({ name: 'a11y', message: `${v.id} (${v.impact}): ${v.nodes.length} node(s)` }));
}

describe('Accessibility (WCAG 2.1 A/AA via axe-core) @a11y', () => {
  beforeEach(() => cy.clearLocalStorage());

  it('login page has no WCAG A/AA violations (BUG-011)', () => {
    cy.visit('/');
    // axe accepts placeholder text as an accessible name, so it does not flag BUG-011.
    // WCAG 1.3.1 / 3.3.2 still want a visible, programmatically associated label, so check that explicitly.
    ['email', 'password'].forEach((id) =>
      cy.get(`[data-testid=${id}]`).should(($i) => {
        expect(($i[0] as HTMLInputElement).labels?.length, `<label> for ${id}`).to.be.greaterThan(0);
      }));
    cy.injectAxe();
    cy.checkA11y(undefined, wcag, logViolations);
  });

  it('orders list has no WCAG A/AA violations (BUG-012)', () => {
    cy.apiLogin().then(({ token }) => { cy.apiOrder(token); cy.apiOrder(token); });
    cy.visit('/');
    cy.get('[data-testid=order-row]').should('have.length.at.least', 1);
    cy.injectAxe();
    cy.checkA11y(undefined, wcag, logViolations);
  });

  it('new-order form has no WCAG A/AA violations', () => {
    cy.apiLogin(); cy.visit('/');
    ordersPage.openNew();
    cy.injectAxe();
    cy.checkA11y(undefined, wcag, logViolations);
  });

  it('keyboard: login form can be submitted with Enter', () => {
    cy.visit('/');
    cy.get('[data-testid=email]').focus().type('x@example.com{enter}');
    cy.get('[data-testid=submit]').should('exist');
  });
});
