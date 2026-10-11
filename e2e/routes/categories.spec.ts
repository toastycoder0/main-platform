import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

async function waitForTree(page: Page) {
  await page.waitForSelector('[role=tree]');
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

describe('Categories E2E', () => {
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

  it('redirects a guest away from the categories page to login', async () => {
    await page.goto(`${BASE}/dashboard/categories`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('redirects a guest away from the new category page to login', async () => {
    await page.goto(`${BASE}/dashboard/categories/new`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('redirects a guest away from the edit category page to login', async () => {
    await page.goto(`${BASE}/dashboard/categories/form/cat-any`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('renders the empty state for a user with categories access', async () => {
    await loginAsAdmin(page);
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(`${BASE}/dashboard/categories`);
    await page.waitForSelector('h1:has-text("Gestión de categorías")');

    // Wait for the tree to resolve (either skeleton or actual tree)
    // then ensure empty state is visible
    await page.waitForSelector('[data-slot=list-empty]');
    expect(consoleErrors).toEqual([]);
  });

  it('creates a category from the toolbar button', async () => {
    await loginAsAdmin(page);
    const categoryName = `E2E Categoría ${Date.now()}`;

    await page.goto(`${BASE}/dashboard/categories`);
    await page.getByRole('link', { name: 'Crear categoría' }).click();
    await page.waitForURL('**/dashboard/categories/new');
    await page.waitForSelector('#category-form');

    await page.getByLabel('Nombre').fill(categoryName);
    await page.click('#category-form button[type="submit"]');

    await page.waitForURL(`${BASE}/dashboard/categories`);
    await waitForTree(page);

    expect(await page.getByText(categoryName).isVisible()).toBe(true);
  });

  it('opens the edit form from the dropdown and submits back to the list', async () => {
    await loginAsAdmin(page);
    const categoryName = `E2E Edit ${Date.now()}`;
    const editedName = `${categoryName} editado`;

    // Create first
    await page.goto(`${BASE}/dashboard/categories`);
    await page.getByRole('link', { name: 'Crear categoría' }).click();
    await page.waitForURL('**/dashboard/categories/new');
    await page.waitForSelector('#category-form');
    await page.getByLabel('Nombre').fill(categoryName);
    await page.click('#category-form button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard/categories`);
    await waitForTree(page);

    // Open edit from dropdown
    await page
      .getByRole('treeitem')
      .filter({ hasText: categoryName })
      .getByLabel('Acciones')
      .click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    await page.waitForURL('**/dashboard/categories/form/**');
    await page.waitForSelector('#category-form');
    expect(await page.getByLabel('Nombre').inputValue()).toBe(categoryName);

    // Edit name
    await page.getByLabel('Nombre').fill(editedName);
    await page.click('#category-form button[type="submit"]');

    await page.waitForURL(`${BASE}/dashboard/categories`);
    await waitForTree(page);
    expect(await page.getByText(editedName).isVisible()).toBe(true);
  });

  it('archives a category from the edit form', async () => {
    await loginAsAdmin(page);
    const categoryName = `E2E Archive ${Date.now()}`;

    // Create first
    await page.goto(`${BASE}/dashboard/categories`);
    await page.getByRole('link', { name: 'Crear categoría' }).click();
    await page.waitForURL('**/dashboard/categories/new');
    await page.waitForSelector('#category-form');
    await page.getByLabel('Nombre').fill(categoryName);
    await page.click('#category-form button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard/categories`);
    await waitForTree(page);

    // Open edit from dropdown
    await page
      .getByRole('treeitem')
      .filter({ hasText: categoryName })
      .getByLabel('Acciones')
      .click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    await page.waitForURL('**/dashboard/categories/form/**');
    await page.waitForSelector('#category-form');

    // Archive
    await page.getByRole('button', { name: 'Archivar categoría' }).click();
    await page.getByRole('button', { name: 'Archivar', exact: true }).click();
    await page.waitForURL(`${BASE}/dashboard/categories`);
    await page.waitForSelector('[role=tree]');
    expect(await page.getByText(categoryName).count()).toBe(0);
  });

  it('toggles active state from the dropdown', async () => {
    await loginAsAdmin(page);
    const categoryName = `E2E Toggle ${Date.now()}`;

    // Create
    await page.goto(`${BASE}/dashboard/categories`);
    await page.getByRole('link', { name: 'Crear categoría' }).click();
    await page.waitForURL('**/dashboard/categories/new');
    await page.waitForSelector('#category-form');
    await page.getByLabel('Nombre').fill(categoryName);
    await page.click('#category-form button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard/categories`);
    await waitForTree(page);

    // Toggle active via dropdown
    await page
      .getByRole('treeitem')
      .filter({ hasText: categoryName })
      .getByLabel('Acciones')
      .click();
    await page.getByRole('menuitem', { name: 'Desactivar' }).click();
    await page.getByText('Inactiva').waitFor();
  });
});
