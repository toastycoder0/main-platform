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
    if (message.type() !== 'error') {
      return;
    }

    if (message.text().includes('https://react.dev/link/hydration-mismatch')) {
      return;
    }

    errors.push(message.text());
  });

  return errors;
}

const errorToast = (page: Page) => page.locator('[data-sonner-toast][data-type="error"]');

async function saveCollection(page: Page, path: string) {
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes(path) && response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Guardar cambios' }).click(),
  ]);
}

async function resetCollection(page: Page, removeLabel: RegExp, path: string, savedToast: string) {
  const removeButtons = page.getByRole('button', { name: removeLabel });

  while ((await removeButtons.count()) > 0) {
    await removeButtons.first().click();
  }

  await saveCollection(page, path);
  await page.getByText(savedToast).waitFor();
  await page.getByText(savedToast).waitFor({ state: 'detached' });
}

async function createUserThroughForm(page: Page, stamp: number, password: string) {
  const email = `e2e.user.${stamp}@example.com`;

  await page.goto(`${BASE}/dashboard/users/new`);
  await page.waitForSelector('#user-form');
  await page.locator('#user-form-first-name').fill('E2E');
  await page.locator('#user-form-last-name').fill(`Usuario ${stamp}`);
  await page.locator('#user-form-email').fill(email);
  await page.locator('#user-form-password').fill(password);
  await page.click('#user-form button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard/users`);
  await waitForTable(page);

  return email;
}

async function gotoUsersByEmail(page: Page, email: string) {
  await page.goto(`${BASE}/dashboard/users?q=${email}`);
  await waitForTable(page);
  await page.getByRole('cell', { name: email, exact: true }).waitFor();
}

async function openEditForm(page: Page, fullName: string) {
  await page.getByLabel(`Acciones de ${fullName}`).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await page.waitForURL('**/dashboard/users/form/**');
  await page.waitForSelector('#user-form');
}

async function deleteUserFromForm(page: Page, email: string) {
  await page.getByRole('button', { name: 'Eliminar usuario' }).click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.waitForURL(`${BASE}/dashboard/users`);
  await waitForTable(page);

  await searchBox(page).fill(email);
  await page.waitForURL(`**/dashboard/users?q=${email}`);
  await emptyState(page).waitFor();
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

  it('renders the own profile and navigates sections through routes', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/account`);

    await page.waitForSelector('h1:has-text("Mi perfil")');
    expect(await page.getByText(ADMIN_EMAIL).first().isVisible()).toBe(true);

    await page.getByRole('link', { name: 'Seguridad' }).click();
    await page.waitForURL('**/account/security');
    await page.getByRole('heading', { name: 'Cambiar contraseña' }).waitFor();

    await page.getByRole('link', { name: 'Direcciones' }).click();
    await page.waitForURL('**/account/addresses');
    await page.getByRole('heading', { name: 'Direcciones' }).waitFor();

    await page.getByRole('link', { name: 'Facturación' }).click();
    await page.waitForURL('**/account/billing');
    await page.getByRole('heading', { name: 'Perfiles de facturación' }).waitFor();
  });

  it('creates a tax profile filtering the CFDI and fiscal regime comboboxes', async () => {
    await loginAsAdmin(page);
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(`${BASE}/account/billing`);
    await page.getByRole('heading', { name: 'Perfiles de facturación' }).waitFor();
    await resetCollection(
      page,
      /Eliminar perfil fiscal/,
      '/account/billing',
      'Perfiles de facturación guardados',
    );

    const alias = `Perfil ${Date.now()}`;
    await page.getByRole('button', { name: 'Agregar perfil' }).click();

    const item = page.locator('[data-slot=collection-item]').last();

    await item.getByLabel('Alias', { exact: true }).fill(alias);
    await item.getByLabel('Razón social', { exact: true }).fill('Mi Empresa S.A. de C.V.');
    await item.getByLabel('RFC', { exact: true }).fill('ABC123456789');
    await item.getByLabel('Código postal fiscal', { exact: true }).fill('06000');

    const cfdi = item.getByLabel('Uso de CFDI', { exact: true });

    await cfdi.click();
    await cfdi.fill('zzz-no-existe');
    await page.getByText('Sin resultados').waitFor();

    await cfdi.fill('mobiliario');
    await page
      .getByRole('option', { name: 'I02 - Mobiliario y equipo de oficina para inversiones' })
      .click();
    expect(await cfdi.inputValue()).toBe('I02 - Mobiliario y equipo de oficina para inversiones');

    const regime = item.getByLabel('Régimen fiscal', { exact: true });

    await regime.click();
    await regime.fill('PEMEX');
    await page.getByRole('option', { name: '617 - PEMEX' }).click();
    expect(await regime.inputValue()).toBe('617 - PEMEX');

    await saveCollection(page, '/account/billing');

    await page.reload();
    expect(await page.getByLabel('Alias', { exact: true }).inputValue()).toBe(alias);
    expect(await page.locator('[data-slot=collection-item]').count()).toBe(1);

    const editedAlias = `${alias} editado`;
    await page.getByLabel('Alias', { exact: true }).fill(editedAlias);
    await saveCollection(page, '/account/billing');

    await page.reload();
    expect(await page.getByLabel('Alias', { exact: true }).inputValue()).toBe(editedAlias);
    expect(await page.locator('[data-slot=collection-item]').count()).toBe(1);

    await page.getByRole('button', { name: 'Agregar perfil' }).click();
    const second = page.locator('[data-slot=collection-item]').nth(1);
    await second.getByLabel('Alias', { exact: true }).fill('Segundo');
    await second.getByLabel('Razón social', { exact: true }).fill('Segunda S.A. de C.V.');
    await second.getByLabel('RFC', { exact: true }).fill('DEF123456789');
    await second.getByLabel('Código postal fiscal', { exact: true }).fill('06000');

    const cfdiSecond = second.getByLabel('Uso de CFDI', { exact: true });
    await cfdiSecond.click();
    await cfdiSecond.fill('mobiliario');
    await page
      .getByRole('option', { name: 'I02 - Mobiliario y equipo de oficina para inversiones' })
      .click();

    const regimeSecond = second.getByLabel('Régimen fiscal', { exact: true });
    await regimeSecond.click();
    await regimeSecond.fill('PEMEX');
    await page.getByRole('option', { name: '617 - PEMEX' }).click();

    await saveCollection(page, '/account/billing');

    await page.reload();
    expect(await page.locator('[data-slot=collection-item]').count()).toBe(2);

    await page.getByRole('button', { name: 'Eliminar perfil fiscal 1' }).click();
    await saveCollection(page, '/account/billing');

    await page.reload();
    expect(await page.locator('[data-slot=collection-item]').count()).toBe(1);
    expect(await page.getByLabel('Alias', { exact: true }).inputValue()).toBe('Segundo');
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

  it('edits a user and persists the changes after reopening the form', async () => {
    await loginAsAdmin(page);
    const stamp = Date.now();
    const email = await createUserThroughForm(page, stamp, 'Secret123');

    await gotoUsersByEmail(page, email);
    await openEditForm(page, `E2E Usuario ${stamp}`);

    await page.locator('#user-form-last-name').fill(`Editado ${stamp}`);
    await page.click('#user-form button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard/users`);
    await waitForTable(page);

    await gotoUsersByEmail(page, email);
    await page.getByRole('cell', { name: `E2E Editado ${stamp}`, exact: true }).waitFor();

    await openEditForm(page, `E2E Editado ${stamp}`);
    expect(await page.locator('#user-form-last-name').inputValue()).toBe(`Editado ${stamp}`);

    await deleteUserFromForm(page, email);
  });

  it('manages the address and tax collections from the admin user form', async () => {
    await loginAsAdmin(page);
    const stamp = Date.now();
    const email = await createUserThroughForm(page, stamp, 'Secret123');

    await gotoUsersByEmail(page, email);
    await openEditForm(page, `E2E Usuario ${stamp}`);

    const addressItems = page.locator('[data-collection=addresses] [data-slot=collection-item]');
    const taxItems = page.locator('[data-collection=taxProfiles] [data-slot=collection-item]');

    await page.getByRole('button', { name: 'Agregar dirección' }).click();
    await addressItems.last().getByLabel('Nombre', { exact: true }).fill('Casa Admin');
    await addressItems.last().getByLabel('Calle', { exact: true }).fill('Av. Admin');
    await addressItems.last().getByLabel('Número exterior', { exact: true }).fill('1');
    await addressItems.last().getByLabel('Colonia', { exact: true }).fill('Centro');
    await addressItems.last().getByLabel('Municipio', { exact: true }).fill('Municipio');
    await addressItems.last().getByLabel('Estado', { exact: true }).fill('Estado');
    await addressItems.last().getByLabel('Código postal', { exact: true }).fill('00001');

    await page.getByRole('button', { name: 'Agregar perfil' }).click();
    await taxItems.last().getByLabel('Alias', { exact: true }).fill('Empresa Admin');
    await taxItems.last().getByLabel('Razón social', { exact: true }).fill('Admin S.A. de C.V.');
    await taxItems.last().getByLabel('RFC', { exact: true }).fill('ABC123456789');
    await taxItems.last().getByLabel('Código postal fiscal', { exact: true }).fill('00001');

    const cfdi = taxItems.last().getByLabel('Uso de CFDI', { exact: true });
    await cfdi.click();
    await cfdi.fill('mobiliario');
    await page
      .getByRole('option', { name: 'I02 - Mobiliario y equipo de oficina para inversiones' })
      .click();

    const regime = taxItems.last().getByLabel('Régimen fiscal', { exact: true });
    await regime.click();
    await regime.fill('PEMEX');
    await page.getByRole('option', { name: '617 - PEMEX' }).click();

    await page.click('#user-form button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard/users`);
    await waitForTable(page);

    await gotoUsersByEmail(page, email);
    await openEditForm(page, `E2E Usuario ${stamp}`);

    expect(await addressItems.count()).toBe(1);
    expect(await page.locator('#addresses-0-name').inputValue()).toBe('Casa Admin');
    expect(await taxItems.count()).toBe(1);
    expect(await page.locator('#taxProfiles-0-alias').inputValue()).toBe('Empresa Admin');

    await page.getByRole('button', { name: 'Eliminar dirección 1' }).click();
    await page.getByRole('button', { name: 'Eliminar perfil fiscal 1' }).click();
    await page.click('#user-form button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard/users`);
    await waitForTable(page);

    await gotoUsersByEmail(page, email);
    await openEditForm(page, `E2E Usuario ${stamp}`);
    expect(await addressItems.count()).toBe(0);
    expect(await taxItems.count()).toBe(0);

    await deleteUserFromForm(page, email);
  });

  it('manages an address from the own profile', async () => {
    await loginAsAdmin(page);
    const stamp = Date.now();
    const addressName = `Casa ${stamp}`;

    await page.goto(`${BASE}/account/addresses`);
    await page.getByRole('heading', { name: 'Direcciones' }).waitFor();
    await resetCollection(
      page,
      /Eliminar dirección/,
      '/account/addresses',
      'Direcciones guardadas',
    );

    await page.getByRole('button', { name: 'Agregar dirección' }).click();
    const item = page.locator('[data-slot=collection-item]').last();

    await item.getByLabel('Nombre', { exact: true }).fill(addressName);
    await item.getByLabel('Calle', { exact: true }).fill('Av. Reforma');
    await item.getByLabel('Número exterior', { exact: true }).fill('123');
    await item.getByLabel('Colonia', { exact: true }).fill('Centro');
    await item.getByLabel('Municipio', { exact: true }).fill('Cuauhtémoc');
    await item.getByLabel('Estado', { exact: true }).fill('Ciudad de México');
    await item.getByLabel('Código postal', { exact: true }).fill('06000');

    await saveCollection(page, '/account/addresses');

    await page.reload();
    expect(await page.getByLabel('Nombre', { exact: true }).inputValue()).toBe(addressName);
    expect(await page.locator('[data-slot=collection-item]').count()).toBe(1);

    await page.getByLabel('Calle', { exact: true }).fill('Av. Insurgentes');
    await saveCollection(page, '/account/addresses');

    await page.reload();
    expect(await page.getByLabel('Calle', { exact: true }).inputValue()).toBe('Av. Insurgentes');
    expect(await page.locator('[data-slot=collection-item]').count()).toBe(1);

    await page.getByRole('button', { name: 'Agregar dirección' }).click();
    const second = page.locator('[data-slot=collection-item]').nth(1);
    await second.getByLabel('Nombre', { exact: true }).fill('Oficina');
    await second.getByLabel('Calle', { exact: true }).fill('Av. Universidad');
    await second.getByLabel('Número exterior', { exact: true }).fill('500');
    await second.getByLabel('Colonia', { exact: true }).fill('Del Valle');
    await second.getByLabel('Municipio', { exact: true }).fill('Benito Juárez');
    await second.getByLabel('Estado', { exact: true }).fill('Ciudad de México');
    await second.getByLabel('Código postal', { exact: true }).fill('03100');
    await saveCollection(page, '/account/addresses');

    await page.reload();
    expect(await page.locator('[data-slot=collection-item]').count()).toBe(2);

    await page.getByRole('button', { name: 'Eliminar dirección 1' }).click();
    await saveCollection(page, '/account/addresses');

    await page.reload();
    expect(await page.locator('[data-slot=collection-item]').count()).toBe(1);
    expect(await page.getByLabel('Nombre', { exact: true }).inputValue()).toBe('Oficina');

    await page.getByRole('button', { name: 'Eliminar dirección 1' }).click();
    await saveCollection(page, '/account/addresses');

    await page.reload();
    expect(await page.locator('[data-slot=collection-item]').count()).toBe(0);
  });

  it('changes the own password from the profile and signs in with it', async () => {
    await loginAsAdmin(page);
    const stamp = Date.now();
    const email = await createUserThroughForm(page, stamp, 'Secret123');
    const newPassword = `NuevaClave${stamp}`;

    await page.context().clearCookies();
    await loginAs(page, email, 'Secret123');
    await page.waitForURL(`${BASE}/`);

    await page.goto(`${BASE}/account/security`);
    await page.waitForSelector('#password-form');
    await page.locator('#profile-current-password').fill('Secret123');
    await page.locator('#profile-new-password').fill(newPassword);
    await page.locator('#password-form button[type="submit"]').click();
    await page.getByText('Contraseña actualizada').waitFor();
    await page.waitForURL('**/account/security');

    await page.context().clearCookies();

    await loginAs(page, email, 'Secret123');
    await errorToast(page).waitFor();

    await loginAs(page, email, newPassword);
    await page.waitForURL(`${BASE}/`);

    await page.context().clearCookies();
    await loginAsAdmin(page);
    await gotoUsersByEmail(page, email);
    await openEditForm(page, `E2E Usuario ${stamp}`);
    await deleteUserFromForm(page, email);
  });

  it('resets a user password from the access panel and blocks the old one', async () => {
    await loginAsAdmin(page);
    const stamp = Date.now();
    const email = await createUserThroughForm(page, stamp, 'Secret123');
    const newPassword = `ResetClave${stamp}`;

    await gotoUsersByEmail(page, email);
    await openEditForm(page, `E2E Usuario ${stamp}`);
    await page.getByRole('heading', { name: 'Acceso' }).waitFor();

    await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
    await page.getByRole('dialog').waitFor();
    await page.locator('#reset-password').fill(newPassword);
    await page.getByRole('button', { name: 'Restablecer', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });

    await page.context().clearCookies();

    await loginAs(page, email, 'Secret123');
    await errorToast(page).waitFor();

    await loginAs(page, email, newPassword);
    await page.waitForURL(`${BASE}/`);

    await page.context().clearCookies();
    await loginAsAdmin(page);
    await gotoUsersByEmail(page, email);
    await openEditForm(page, `E2E Usuario ${stamp}`);
    await deleteUserFromForm(page, email);
  });
});
