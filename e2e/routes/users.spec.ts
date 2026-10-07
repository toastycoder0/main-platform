import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage, loginAs } from '../test-utils/browser';

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

const searchBox = (page: Page) => page.getByLabel('Buscar usuarios');
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

describe('Users list E2E', () => {
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

  it('redirects a guest away from the users page to login', async () => {
    await page.goto(`${BASE}/dashboard/users`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('renders the seeded admin for a user with the users access permission', async () => {
    await loginAsAdmin(page);
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(`${BASE}/dashboard/users`);

    await page.waitForSelector('h1:has-text("Gestión de usuarios")');
    await waitForTable(page);

    expect(await page.getByRole('cell', { name: 'John Doe', exact: true }).isVisible()).toBe(true);
    expect(await page.getByRole('cell', { name: ADMIN_EMAIL, exact: true }).isVisible()).toBe(true);
    expect(await pageSummary(page).textContent()).toBe('Página 1 de 1 · 1 resultado');
    expect(consoleErrors).toEqual([]);
  });

  it('reads the list state from the URL', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/users?q=admin@e2e.test`);
    await waitForTable(page);
    expect(await page.getByRole('cell', { name: ADMIN_EMAIL }).isVisible()).toBe(true);

    await page.goto(`${BASE}/dashboard/users?q=zzz-no-existe`);
    await emptyState(page).waitFor();
    expect(await page.getByText('No se encontraron usuarios').isVisible()).toBe(true);
  });

  it('writes the search term to the URL and lets the server resolve it', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/users`);
    await waitForTable(page);

    await searchBox(page).fill('admin@e2e.test');
    await page.waitForURL('**/dashboard/users?q=admin@e2e.test');
    await waitForTable(page);
    expect(await page.getByRole('cell', { name: ADMIN_EMAIL }).isVisible()).toBe(true);

    await searchBox(page).fill('zzz-no-existe');
    await page.waitForURL('**/dashboard/users?q=zzz-no-existe');
    await emptyState(page).waitFor();
  });

  it('redirects a guest away from the new user page to login', async () => {
    await page.goto(`${BASE}/dashboard/users/new`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('redirects a guest away from the user form to login', async () => {
    await page.goto(`${BASE}/dashboard/users/form/user-any`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('opens the own edit form without the access panel and blocks self-editing', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard/users`);
    await waitForTable(page);

    await page.getByLabel('Acciones de John Doe').click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();

    await page.waitForURL('**/dashboard/users/form/**');
    await page.waitForSelector('#user-form');
    expect(await page.locator('#user-form-email').inputValue()).toBe(ADMIN_EMAIL);

    const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
    expect(await breadcrumb.textContent()).toContain('Usuarios');
    expect(await breadcrumb.textContent()).toContain('Editar usuario');

    expect(await page.getByRole('heading', { name: 'Acceso' }).count()).toBe(0);

    await page.click('#user-form button[type="submit"]');

    await page.getByText('No puedes editar tu propio usuario; usa tu perfil').waitFor();
    expect(page.url()).toContain('/dashboard/users/form/');
  });

  it('redirects a guest away from the account page to login', async () => {
    await page.goto(`${BASE}/account`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('renders the own profile and switches tabs through the URL', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/account`);

    await page.waitForSelector('h1:has-text("Mi perfil")');
    expect(await page.getByText(ADMIN_EMAIL).first().isVisible()).toBe(true);

    await page.getByRole('tab', { name: 'Direcciones' }).click();
    await page.waitForURL('**/account?tab=addresses');
    await page.getByRole('heading', { name: 'Direcciones' }).waitFor();

    await page.getByRole('tab', { name: 'Facturación' }).click();
    await page.waitForURL('**/account?tab=billing');
    await page.getByRole('heading', { name: 'Perfiles de facturación' }).waitFor();
  });

  it('creates a tax profile filtering the CFDI and fiscal regime comboboxes', async () => {
    await loginAsAdmin(page);
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(`${BASE}/account?tab=billing`);
    await page.getByRole('heading', { name: 'Perfiles de facturación' }).waitFor();

    const alias = `Perfil ${Date.now()}`;
    await page.getByRole('button', { name: 'Agregar perfil' }).click();
    await page.getByRole('dialog').waitFor();

    await page.getByLabel('Alias', { exact: true }).fill(alias);
    await page.getByLabel('Razón social', { exact: true }).fill('Mi Empresa S.A. de C.V.');
    await page.getByLabel('RFC', { exact: true }).fill('ABC123456789');
    await page.getByLabel('Código postal fiscal', { exact: true }).fill('06000');

    const cfdi = page.getByLabel('Uso de CFDI', { exact: true });

    await cfdi.click();
    await cfdi.fill('zzz-no-existe');
    await page.getByText('Sin resultados').waitFor();

    await cfdi.fill('mobiliario');
    await page
      .getByRole('option', { name: 'I02 - Mobiliario y equipo de oficina para inversiones' })
      .click();
    expect(await cfdi.inputValue()).toBe('I02 - Mobiliario y equipo de oficina para inversiones');

    const regime = page.getByLabel('Régimen fiscal', { exact: true });

    await regime.click();
    await regime.fill('PEMEX');
    await page.getByRole('option', { name: '617 - PEMEX' }).click();
    expect(await regime.inputValue()).toBe('617 - PEMEX');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByText(alias, { exact: true }).waitFor();
    expect(
      await page
        .getByText('I02 - Mobiliario y equipo de oficina para inversiones')
        .first()
        .isVisible(),
    ).toBe(true);
    expect(consoleErrors).toEqual([]);
  });

  it('creates a user, bans and unbans them, and finally deletes them', async () => {
    await loginAsAdmin(page);
    const stamp = Date.now();
    const userEmail = `e2e.user.${stamp}@example.com`;

    await page.goto(`${BASE}/dashboard/users`);
    await waitForTable(page);

    await page.getByRole('link', { name: 'Crear usuario' }).click();
    await page.waitForURL('**/dashboard/users/new');
    await page.waitForSelector('#user-form');

    const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
    expect(await breadcrumb.textContent()).toContain('Crear usuario');

    await page.locator('#user-form-first-name').fill('E2E');
    await page.locator('#user-form-last-name').fill(`Usuario ${stamp}`);
    await page.locator('#user-form-email').fill(userEmail);
    await page.locator('#user-form-password').fill('Secret123');

    await page.click('#user-form button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard/users`);
    await waitForTable(page);

    await searchBox(page).fill(userEmail);
    await page.waitForURL(`**/dashboard/users?q=${userEmail}`);
    await page.getByRole('cell', { name: userEmail, exact: true }).waitFor();
    await expect
      .poll(() => page.getByRole('cell', { name: ADMIN_EMAIL, exact: true }).count())
      .toBe(0);

    await page.getByLabel(`Acciones de E2E Usuario ${stamp}`).click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    await page.waitForURL('**/dashboard/users/form/**');
    await page.waitForSelector('#user-form');

    await page.getByRole('heading', { name: 'Acceso' }).waitFor();
    expect(await page.getByRole('button', { name: 'Banear usuario' }).isVisible()).toBe(true);

    await page.getByRole('button', { name: 'Banear usuario' }).click();
    await page.getByLabel('Motivo').fill('Prueba e2e');
    await page.getByRole('button', { name: 'Confirmar baneo' }).click();

    await page.getByText('Cuenta baneada').waitFor();
    expect(await page.getByText('Motivo: Prueba e2e').isVisible()).toBe(true);

    await page.getByRole('button', { name: 'Levantar ban' }).click();
    await page.getByRole('button', { name: 'Banear usuario' }).waitFor();

    await page.getByRole('button', { name: 'Eliminar usuario' }).click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();

    await page.waitForURL(`${BASE}/dashboard/users`);
    await waitForTable(page);

    await searchBox(page).fill(userEmail);
    await page.waitForURL(`**/dashboard/users?q=${userEmail}`);
    await emptyState(page).waitFor();
  });
});
