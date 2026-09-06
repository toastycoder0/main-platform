import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

const errorToast = (page: Page) => page.locator('[data-sonner-toast][data-type="error"]');
const fieldError = (page: Page) => page.locator('[data-slot="field-error"]');

async function getSession(page: Page) {
  const res = await page.request.get(`${BASE}/api/auth/get-session`);
  if (res.ok()) {
    return res.json();
  }
  return null;
}

describe('Login E2E', () => {
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

  it('redirects to home on successful login and establishes session', async () => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL('**/');
    expect(page.url()).toBe(`${BASE}/`);
    expect(await errorToast(page).count()).toBe(0);

    const session = await getSession(page);
    expect(session).not.toBeNull();
    expect(session.user).toBeDefined();
    expect(session.user.email).toBe(ADMIN_EMAIL);
  });

  it('shows error toast for invalid credentials', async () => {
    await loginAs(page, ADMIN_EMAIL, 'WrongPass1');
    await page.waitForSelector('[data-sonner-toast][data-type="error"]');
    expect(await errorToast(page).isVisible()).toBe(true);
  });

  it('shows error toast for non-existent user', async () => {
    await loginAs(page, 'nonexistent@e2e.test', 'SomePass123');
    await page.waitForSelector('[data-sonner-toast][data-type="error"]');
    expect(await errorToast(page).isVisible()).toBe(true);
  });

  it('shows validation error for short password', async () => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('#form-email', ADMIN_EMAIL);
    await page.fill('#form-password', 'short');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-slot="field-error"]');
    expect(await fieldError(page).isVisible()).toBe(true);
  });

  it('shows validation error for empty fields', async () => {
    await page.goto(`${BASE}/auth/login`);
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-slot="field-error"]');
    expect(await fieldError(page).count()).toBe(2);
  });
});
