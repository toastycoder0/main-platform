import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

describe('Mobile navbar E2E', () => {
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

  it('exposes the user menu from the hamburger panel with sign-out parity', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL('**/');

    await page.locator('[aria-label="Abrir menú"]').click();
    await page.locator('[aria-label="Menú de usuario"]:visible').click();

    const signOut = page.locator("[data-slot='dropdown-menu-content']").getByText('Cerrar sesión');
    await signOut.waitFor();
    expect(await signOut.isVisible()).toBe(true);
  });
});
