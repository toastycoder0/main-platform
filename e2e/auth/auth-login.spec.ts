import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

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

  it('redirects to home on successful login', async () => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL('**/');
    expect(page.url()).toBe(`${BASE}/`);
  });

  it('shows error toast for invalid credentials', async () => {
    await loginAs(page, ADMIN_EMAIL, 'WrongPass1');

    await page.waitForTimeout(500);
    expect(page.url()).toContain('/auth/login');
  });

  it('shows validation error for short password', async () => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('#form-email', ADMIN_EMAIL);
    await page.fill('#form-password', 'short');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    expect(page.url()).toContain('/auth/login');
  });
});
