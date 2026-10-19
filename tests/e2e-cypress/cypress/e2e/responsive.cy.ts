const devices: { name: string; w: number; h: number }[] = [
  { name: 'iPhone SE', w: 375, h: 667 },
  { name: 'iPhone 14 Pro Max', w: 430, h: 932 },
  { name: 'Galaxy S20', w: 360, h: 800 },
  { name: 'iPad Mini', w: 768, h: 1024 },
  { name: 'Desktop', w: 1440, h: 900 },
];

describe('Responsive layout / compatibility @compatibility', () => {
  devices.forEach(({ name, w, h }) => {
    it(`${name} (${w}x${h}): no horizontal page scroll on the orders list (BUG-013)`, () => {
      cy.viewport(w, h);
      cy.clearLocalStorage();
      cy.apiLogin().then(({ token }) => cy.apiOrder(token));
      cy.visit('/');
      cy.get('[data-testid=order-row]').should('be.visible');
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth, 'scrollWidth').to.be.at.most(doc.documentElement.clientWidth);
      });
    });
  });

  it('primary navigation is reachable on a small viewport', () => {
    cy.viewport(375, 667);
    cy.clearLocalStorage(); cy.apiLogin(); cy.visit('/');
    cy.get('[data-testid=nav-new]').scrollIntoView().should('be.visible');
  });
});
