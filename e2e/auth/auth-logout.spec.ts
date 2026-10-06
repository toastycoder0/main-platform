import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

const errorToast = '[data-sonner-toast][data-type="error"]';

async function signOutThroughMenu(page: Page) {
  await page.locator('[aria-label="Menú de usuario"]:visible').click();
  await page.locator("[data-slot='dropdown-menu-content']").getByText('Cerrar sesión').click();
}

describe('Logout E2E', () => {
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

  it('redirects to login on successful sign-out', async () => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL('**/');

    await signOutThroughMenu(page);

    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
    await page.waitForSelector('#login-form');
    expect(await page.locator('#login-form').count()).toBe(1);
    expect(await page.getByRole('button', { name: 'Intentar de nuevo' }).count()).toBe(0);
  });

  it('stays on the page with an error toast when the session is already gone', async () => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL('**/');
    await page.context().clearCookies();

    await signOutThroughMenu(page);

    await page.waitForSelector(errorToast);
    expect(page.url()).toBe(`${BASE}/`);
  });
});
