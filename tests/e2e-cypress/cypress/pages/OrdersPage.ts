export class OrdersPage {
  openNew() { cy.get('[data-testid=nav-new]').click(); return this; }
  fillOrder(customer: string, sku: string, qty: number | string, price: number | string) {
    cy.get('[data-testid=customer]').clear().type(customer);
    cy.get('[data-testid=sku-0]').clear().type(sku);
    cy.get('[data-testid=qty-0]').clear().type(String(qty));
    cy.get('[data-testid=price-0]').clear().type(String(price));
    return this;
  }
  create() { cy.get('[data-testid=create-order]').click(); return this; }
  rows() { return cy.get('[data-testid=order-row]'); }
  pay() { cy.get('[data-testid=pay]').click(); return this; }
  ship() { cy.get('[data-testid=ship]').click(); return this; }
  cancel() { cy.get('[data-testid=cancel]').click(); return this; }
  status() { return cy.get('[data-testid=status]'); }
  total() { return cy.get('[data-testid=total]'); }
}
export const ordersPage = new OrdersPage();
