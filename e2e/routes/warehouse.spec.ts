import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BASE, createBrowser, createPage, loginAs } from '../test-utils/browser';

const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

async function loginAsAdmin(page: Page) {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await page.waitForURL(`${BASE}/`);
}

async function openMap(page: Page) {
  await loginAsAdmin(page);
  await page.goto(`${BASE}/warehouse?view=map`);
  await page.locator('[data-slot=warehouse-map]').waitFor();
  await page.getByRole('button', { name: /Celda A29/ }).waitFor();
}

describe('Warehouse E2E', () => {
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

  it('redirects a guest away from the warehouse to login', async () => {
    await page.goto(`${BASE}/warehouse`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('shows the lots view and switches to the map', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/warehouse`);

    await page.getByRole('tab', { name: 'Lotes' }).waitFor();
    await page.waitForSelector('[data-slot=list-table], [data-slot=list-empty]');

    await page.getByRole('tab', { name: 'Mapa' }).click();
    await page.waitForURL('**/warehouse?view=map');
    await page.locator('[data-slot=warehouse-map]').waitFor();
    await page.getByRole('button', { name: /Celda A29/ }).waitFor();
    expect(await page.getByLabel('Buscar en el almacén').isVisible()).toBe(true);

    await page.getByRole('tab', { name: 'Lotes' }).click();
    await page.waitForURL(`${BASE}/warehouse`);
    await page.waitForSelector('[data-slot=list-table], [data-slot=list-empty]');
  });

  it('opens the cell panel and edits the capacity with map.edit', async () => {
    await openMap(page);

    await page.getByRole('button', { name: /Celda A29/ }).click();
    await page.getByRole('heading', { name: 'A29' }).waitFor();
    expect(await page.getByText('Sin stock asignado').isVisible()).toBe(true);
    expect(await page.getByRole('button', { name: 'Acercar' }).isVisible()).toBe(true);

    const movementLink = page.getByRole('link', { name: /Registrar movimiento/ });
    expect(await movementLink.isVisible()).toBe(true);
    expect(await movementLink.getAttribute('href')).toContain('movement=transfer');

    const capacity = page.locator('#cell-capacity');
    await capacity.fill('');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByText('Sin capacidad · 0 uds en total').waitFor();

    await capacity.fill('640');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByText('0/640 uds').waitFor();
  });

  it('filters the map with the q search parameter', async () => {
    await openMap(page);

    await page.getByLabel('Buscar en el almacén').fill('A29');
    await page.waitForFunction(() => window.location.search.includes('q=A29'));

    await page
      .locator('[data-slot="warehouse-map"] [aria-label^="Celda A29"][data-search-match="true"]')
      .waitFor();
  });

  it('shows the movement links for an admin', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/warehouse`);

    await page.getByRole('button', { name: 'Movimientos' }).click();

    for (const label of ['Recepción', 'Transferencia', 'Salida de material', 'Entrega']) {
      expect(await page.getByRole('menuitem', { name: new RegExp(label) }).isVisible()).toBe(true);
    }
  });

  it('opens the movement dialog from the menu with the selected type', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/warehouse`);

    await page.getByRole('button', { name: 'Movimientos' }).click();
    await page.getByRole('menuitem', { name: /Recepción/ }).click();

    await page.waitForURL('**/warehouse?movement=reception');
    await page.locator('#movement-kind').waitFor();
    expect(await page.locator('#movement-kind').textContent()).toContain('Recepción');
    expect(await page.getByRole('columnheader', { name: 'Celda destino' }).isVisible()).toBe(true);
    expect(await page.getByRole('columnheader', { name: 'Celda origen' }).isVisible()).toBe(false);
  });

  it('confirms a type change and clears the current rows', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/warehouse?movement=transfer`);

    await page.locator('#movement-kind').waitFor();
    await page.locator('#movement-row-0-quantity').fill('5');

    await page.locator('#movement-kind').click();
    await page.getByRole('option', { name: 'Salida de material' }).click();

    await page.getByText('Al cambiar el tipo se limpiarán las filas actuales').waitFor();
    await page.getByRole('button', { name: 'Cambiar tipo' }).click();

    await page.locator('#movement-kind').waitFor();
    expect(await page.locator('#movement-kind').textContent()).toContain('Salida de material');
    expect(await page.getByRole('columnheader', { name: 'Celda destino' }).isVisible()).toBe(false);
    expect(await page.locator('#movement-row-0-quantity').inputValue()).toBe('');
  });

  it('validates required fields before closing', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/warehouse?movement=reception`);

    const dialog = page.getByRole('dialog');
    await dialog.locator('#movement-kind').waitFor();
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();

    await page.getByText('El título de la sesión es obligatorio').waitFor();
    expect(await page.getByText('Selecciona un lote').isVisible()).toBe(true);
    expect(await page.getByText('Selecciona una celda destino').isVisible()).toBe(true);
    expect(await dialog.isVisible()).toBe(true);
  });

  it('allows several out rows in one movement', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/warehouse?movement=materialOut`);

    const dialog = page.getByRole('dialog');
    await dialog.locator('#movement-kind').waitFor();

    await dialog.getByRole('button', { name: 'Agregar movimiento' }).click();
    await dialog.getByRole('button', { name: 'Agregar movimiento' }).click();

    expect(await dialog.locator('tbody tr').count()).toBe(3);
    expect(await dialog.getByRole('columnheader', { name: 'Celda origen' }).isVisible()).toBe(true);
    expect(await dialog.getByRole('columnheader', { name: 'Celda destino' }).isVisible()).toBe(
      false,
    );
  });

  it('preselects the cell from the map panel and clears params on close', async () => {
    await openMap(page);

    await page.getByRole('button', { name: /Celda A29/ }).click();
    await page.getByRole('heading', { name: 'A29' }).waitFor();
    await page.getByRole('link', { name: /Registrar movimiento/ }).click();

    await page.locator('#movement-kind').waitFor();
    await page.waitForURL(/movement=transfer/);
    await page.waitForURL(/cell=/);
    expect(await page.locator('#movement-row-0-originCell').inputValue()).toBe('A29');

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.waitForFunction(() => !window.location.search.includes('movement='));
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  });

  it('writes the lots search term to the URL and shows the empty state', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/warehouse`);

    await page.getByLabel('Buscar lotes').fill('zzz-no-existe');
    await page.waitForURL('**/warehouse?q=zzz-no-existe');
    await page.locator('[data-slot=list-empty]').waitFor();
  });

  it('stacks the search below the tabs and movements on mobile', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto(`${BASE}/warehouse`);

    const tabs = await page.getByRole('tab', { name: 'Lotes' }).boundingBox();
    const movements = await page.getByRole('button', { name: 'Movimientos' }).boundingBox();
    const search = await page.getByLabel('Buscar lotes').boundingBox();

    expect(tabs).not.toBeNull();
    expect(movements).not.toBeNull();
    expect(search).not.toBeNull();

    if (tabs && movements && search) {
      expect(Math.abs(tabs.y - movements.y)).toBeLessThan(20);
      expect(search.y).toBeGreaterThan(tabs.y + tabs.height / 2);
    }
  });
});
