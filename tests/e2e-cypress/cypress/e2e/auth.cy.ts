import { loginPage } from '../pages/LoginPage';

describe('Authentication @smoke @functional', () => {
  beforeEach(() => cy.clearLocalStorage());

  it('registers a new user and lands on the orders list', () => {
    loginPage.visit().toggleMode().name('Cy User').email(`reg_${Date.now()}@example.com`).password('Password123!').submit();
    cy.contains('h2', 'Orders').should('be.visible');
  });

  it('logs in with valid credentials and logs out', () => {
    cy.apiLogin().then(({ email }) => {
      cy.clearLocalStorage();
      loginPage.loginAs(email, 'Password123!');
      cy.contains('h2', 'Orders').should('be.visible');
      cy.get('[data-testid=logout]').click();
      cy.get('[data-testid=submit]').should('be.visible');
    });
  });

  it('shows a visible error for wrong credentials (BUG-015)', () => {
    loginPage.loginAs('nobody@example.com', 'WrongPass123!');
    loginPage.error().should('be.visible').and('not.be.empty');
  });

  it('wrong password and unknown user get the same response (BUG-008)', () => {
    // Asserted on the network response, not on the on-screen text, so it does not depend on BUG-015 (hidden errors).
    cy.intercept('POST', '**/api/login').as('login');
    cy.apiLogin().then(({ email }) => {
      cy.clearLocalStorage();
      loginPage.loginAs(email, 'WrongPass123!');
      cy.wait('@login').then(({ response: known }) => {
        loginPage.visit().email(`ghost_${Date.now()}@example.com`).password('WrongPass123!').submit();
        cy.wait('@login').then(({ response: unknown }) => {
          expect(unknown!.statusCode, 'unknown user status').to.eq(known!.statusCode);
          expect(unknown!.body.message, 'unknown user message').to.eq(known!.body.message);
        });
      });
    });
  });

  it('rejects an invalid e-mail on registration (BUG-001)', () => {
    // Wait for the register call and assert the server said 422. A bare "not on Orders page" check passes too early.
    cy.intercept('POST', '**/api/register').as('register');
    loginPage.visit().toggleMode().name('Bad').email(`not-an-email-${Date.now()}`).password('Password123!').submit();
    cy.wait('@register').its('response.statusCode').should('eq', 422);
    cy.contains('h2', 'Orders').should('not.exist');
  });
});
