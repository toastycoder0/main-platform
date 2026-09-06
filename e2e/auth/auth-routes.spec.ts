import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

describe('Auth route restrictions E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await createBrowser();
  });

  beforeEach(async () => {
    page = await createPage(browser);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('redirects authenticated user away from /auth/login', async () => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
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
});
