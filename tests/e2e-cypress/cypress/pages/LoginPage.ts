export class LoginPage {
  visit() { cy.visit('/'); return this; }
  email(v: string) { cy.get('[data-testid=email]').clear().type(v); return this; }
  password(v: string) { cy.get('[data-testid=password]').clear().type(v, { log: false }); return this; }
  submit() { cy.get('[data-testid=submit]').click(); return this; }
  toggleMode() { cy.get('[data-testid=toggle-mode]').click(); return this; }
  name(v: string) { cy.get('[data-testid=name]').type(v); return this; }
  error() { return cy.get('[data-testid=auth-error]'); }
  loginAs(email: string, password: string) { return this.visit().email(email).password(password).submit(); }
}
export const loginPage = new LoginPage();
