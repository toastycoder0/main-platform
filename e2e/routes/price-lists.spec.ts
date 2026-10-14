import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

async function waitForTable(page: Page) {
  await page.waitForSelector('[data-slot=table-body]');
}

async function loginAsAdmin(page: Page) {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await page.waitForURL(`${BASE}/`);
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  return errors;
}

describe('Price Lists E2E', () => {
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

  it('redirects a guest away from the price lists page to login', async () => {
    await page.goto(`${BASE}/dashboard/price-lists`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('redirects a guest away from the new price list page to login', async () => {
    await page.goto(`${BASE}/dashboard/price-lists/new`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('redirects a guest away from the edit price list page to login', async () => {
    await page.goto(`${BASE}/dashboard/price-lists/form/plst-any`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('renders the seeded price lists for an admin', async () => {
    await loginAsAdmin(page);
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(`${BASE}/dashboard/price-lists`);

    await page.waitForSelector('h1:has-text("Listas de precios")');
    await waitForTable(page);

    expect(await page.getByRole('cell', { name: 'A', exact: true }).isVisible()).toBe(true);
    expect(consoleErrors).toEqual([]);
  });

  it('reads the list state from the URL', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/price-lists?q=a`);
    await waitForTable(page);
    expect(await page.getByRole('cell', { name: 'A', exact: true }).isVisible()).toBe(true);

    await page.goto(`${BASE}/dashboard/price-lists?q=zzz-no-existe`);
    await page.locator('[data-slot=list-empty]').waitFor();
    expect(await page.getByText('No se encontraron listas de precios').isVisible()).toBe(true);
  });

  it('reports the real total on a page beyond the last one', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/price-lists?page=999`);

    await page.waitForSelector('text=/^Página 999 de/');
  });

  it('writes the search term to the URL and lets the server resolve it', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/price-lists`);
    await waitForTable(page);

    await page.getByLabel('Buscar listas de precios').fill('a');
    await page.waitForURL('**/dashboard/price-lists?q=a');
    await waitForTable(page);
    expect(await page.getByRole('cell', { name: 'A', exact: true }).isVisible()).toBe(true);

    await page.getByLabel('Buscar listas de precios').fill('zzz-no-existe');
    await page.waitForURL('**/dashboard/price-lists?q=zzz-no-existe');
    await page.locator('[data-slot=list-empty]').waitFor();
  });

  it('creates a price list from the toolbar button', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/price-lists`);
    await waitForTable(page);

    const priceListName = `E2E Lista ${Date.now()}`;

    await page.getByRole('link', { name: 'Crear lista de precios' }).click();
    await page.waitForURL('**/dashboard/price-lists/new');
    await page.waitForSelector('#price-list-form');

    await page.getByLabel('Nombre').fill(priceListName);
    await page.click('#price-list-form button[type="submit"]');

    await page.waitForURL(`${BASE}/dashboard/price-lists`);
    await waitForTable(page);

    await page.getByLabel('Buscar listas de precios').fill(priceListName);
    await page.waitForURL('**/dashboard/price-lists?q=*');
    await waitForTable(page);
    expect(await page.getByRole('cell', { name: priceListName, exact: true }).isVisible()).toBe(
      true,
    );
  });

  it('opens the edit form from the row actions and submits back to the list', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/price-lists`);
    await waitForTable(page);

    const seededName = 'A';

    await page.getByLabel(`Acciones de ${seededName}`).click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();

    await page.waitForURL('**/dashboard/price-lists/form/**');
    await page.waitForSelector('#price-list-form');
    expect(await page.getByLabel('Nombre').inputValue()).toBe(seededName);

    await page.click('#price-list-form button[type="submit"]');

    await page.waitForURL(`${BASE}/dashboard/price-lists`);
    await waitForTable(page);
    expect(await page.getByRole('cell', { name: seededName, exact: true }).isVisible()).toBe(true);
  });
});
