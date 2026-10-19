import { test, expect, request, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const API = process.env.API_URL || 'http://localhost:8000/api';

async function seededSession(page: Page) {
  const ctx = await request.newContext({ extraHTTPHeaders: { Accept: 'application/json' } });
  const email = `pw_${Date.now()}_${Math.floor(Math.random() * 9999)}@example.com`;
  const res = await ctx.post(`${API}/register`, { data: { name: 'PW', email, password: 'Password123!' } });
  const { token } = await res.json();
  await ctx.post(`${API}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { customer_name: 'Mobile Co', items: [{ sku: 'M1', quantity: 2, unit_price: 12.5 }] },
  });
  await page.addInitScript((t) => localStorage.setItem('token', t), token);
  return { token, email };
}

test('login shows an error on failure, usable by touch (BUG-015)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('email').fill('nobody@example.com');
  await page.getByTestId('password').fill('WrongPass123!');
  await page.getByTestId('submit').tap();
  await expect(page.getByTestId('auth-error')).toBeVisible();
});

test('orders list does not overflow the viewport horizontally (BUG-013)', async ({ page }) => {
  await seededSession(page);
  await page.goto('/');
  await expect(page.getByTestId('order-row').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('full workflow on a phone: open > pay > ship', async ({ page }) => {
  await seededSession(page);
  await page.goto('/');
  const view = page.getByTestId('order-row').first().getByRole('button');
  // On the seeded build the whole page is wider than the screen, so on Android Chrome "View" sits off-screen
  // and cannot be tapped (BUG-013). On the fixed build the table scrolls inside its own box and Playwright
  // scrolls it into reach. A short tap timeout turns the old 30 s hang into a clear failure.
  await view.tap({ timeout: 5000 }).catch((e) => {
    throw new Error(`View button could not be tapped, likely unreachable off-screen (BUG-013): ${String(e.message).split('\n')[0]}`);
  });
  await page.getByTestId('pay').tap();
  await expect(page.getByTestId('status')).toHaveText('paid');
  await page.getByTestId('ship').tap();
  await expect(page.getByTestId('status')).toHaveText('shipped');
});

test('buttons meet the 24x24 CSS px target size (WCAG 2.2 AA 2.5.8)', async ({ page }) => {
  await seededSession(page);
  await page.goto('/');
  for (const b of await page.getByRole('button').all()) {
    const box = await b.boundingBox();
    if (box) { expect(box.width).toBeGreaterThanOrEqual(24); expect(box.height).toBeGreaterThanOrEqual(24); }
  }
});

test('axe scan of the orders list on mobile (BUG-012)', async ({ page }) => {
  await seededSession(page);
  await page.goto('/');
  await expect(page.getByTestId('order-row').first()).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
