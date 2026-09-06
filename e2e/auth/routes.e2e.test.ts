import { type Browser, chromium, type Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, loginAs } from '../helpers';

const BASE = 'http://localhost:3001';

describe('Auth route restrictions E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('redirects authenticated user away from /auth/login', async () => {
    const email = `route-redirect-${Date.now()}@test.com`;
    await createUser(email, 'Pass1234');

    await loginAs(page, email, 'Pass1234');
    await page.waitForURL('**/');

    await page.goto(`${BASE}/auth/login`);
    await page.waitForURL('**/');
    expect(page.url()).toBe(`${BASE}/`);
  });

  it('shows login link for guest on home page', async () => {
    await page.goto(`${BASE}/`);
    const count = await page.getByText('Iniciar sesión').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('hides login link after authentication', async () => {
    const email = `route-authed-${Date.now()}@test.com`;
    await createUser(email, 'Pass1234');

    await loginAs(page, email, 'Pass1234');
    await page.waitForURL('**/');

    const count = await page.getByText('Cerrar sesión').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('clears session after logout', async () => {
    const email = `route-logout-${Date.now()}@test.com`;
    await createUser(email, 'Pass1234');

    await loginAs(page, email, 'Pass1234');
    await page.waitForURL('**/');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/auth/login');
    expect(page.url()).toContain('/auth/login');
  });
});
