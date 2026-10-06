import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';
const SEEDED_ROLE = 'Super Administrador';

const searchBox = (page: Page) => page.getByLabel('Buscar roles');
const roleCell = (page: Page) => page.getByRole('cell', { name: SEEDED_ROLE });
const emptyState = (page: Page) => page.locator('[data-slot=list-empty]');
const pageSummary = (page: Page) => page.locator('text=/^Página \\d+ de \\d+/');

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

describe('Roles list E2E', () => {
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

  it('redirects a guest away from the roles page to login', async () => {
    await page.goto(`${BASE}/dashboard/roles`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('renders the seeded role for an admin with the roles access permission', async () => {
    await loginAsAdmin(page);
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(`${BASE}/dashboard/roles`);

    await page.waitForSelector('h1:has-text("Gestión de roles")');
    await waitForTable(page);

    expect(await roleCell(page).isVisible()).toBe(true);
    expect(await pageSummary(page).textContent()).toBe('Página 1 de 1 · 1 resultado');
    expect(consoleErrors).toEqual([]);
  });

  it('reads the list state from the URL', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/roles?q=super`);
    await waitForTable(page);
    expect(await roleCell(page).isVisible()).toBe(true);

    await page.goto(`${BASE}/dashboard/roles?q=zzz-no-existe`);
    await emptyState(page).waitFor();
    expect(await page.getByText('No se encontraron roles').isVisible()).toBe(true);
  });

  it('reports the real total on a page beyond the last one', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/roles?page=999`);

    await page.waitForSelector('text=/^Página 999 de 1/');
    expect(await pageSummary(page).textContent()).toBe('Página 999 de 1 · 1 resultado');
  });

  it('writes the search term to the URL and lets the server resolve it', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/roles`);
    await waitForTable(page);

    await searchBox(page).fill('super');
    await page.waitForURL('**/dashboard/roles?q=super');
    await waitForTable(page);
    expect(await roleCell(page).isVisible()).toBe(true);

    await searchBox(page).fill('zzz-no-existe');
    await page.waitForURL('**/dashboard/roles?q=zzz-no-existe');
    await emptyState(page).waitFor();
  });
});
