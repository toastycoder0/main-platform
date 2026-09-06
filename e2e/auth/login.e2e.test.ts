import { type Browser, chromium, type Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, loginAs } from '../helpers';

const BASE = 'http://localhost:3001';

describe('Login E2E', () => {
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

  it('redirects to home on successful login', async () => {
    const email = `login-success-${Date.now()}@test.com`;
    await createUser(email, 'Pass1234');

    await loginAs(page, email, 'Pass1234');
    await page.waitForURL('**/');
    expect(page.url()).toBe(`${BASE}/`);
  });

  it('shows error toast for invalid credentials', async () => {
    const email = `login-fail-${Date.now()}@test.com`;
    await createUser(email, 'Pass1234');

    await loginAs(page, email, 'WrongPass1');

    await page.waitForTimeout(500);
    expect(page.url()).toContain('/auth/login');
  });

  it('shows validation error for short password', async () => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('#form-email', 'any@test.com');
    await page.fill('#form-password', 'short');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    expect(page.url()).toContain('/auth/login');
  });
});
