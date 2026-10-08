import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

describe('Mobile account nav E2E', () => {
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

  it('navigates account sections from the mobile section selector', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL('**/');

    await page.goto(`${BASE}/account`);
    await page.getByRole('heading', { name: 'Mi perfil' }).waitFor();

    await page.getByRole('combobox', { name: 'Sección de la cuenta' }).click();
    await page.getByRole('option', { name: 'Direcciones' }).click();

    await page.waitForURL('**/account/addresses');
    await page.getByRole('heading', { name: 'Direcciones' }).waitFor();

    expect(await page.getByRole('combobox', { name: 'Sección de la cuenta' }).isVisible()).toBe(
      true,
    );
  });
});
