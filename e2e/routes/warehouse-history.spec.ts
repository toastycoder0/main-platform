import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BASE, createBrowser, createPage, loginAs } from '../test-utils/browser';

const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

async function loginAsAdmin(page: Page) {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await page.waitForURL(`${BASE}/`);
}

async function openMovements(page: Page) {
  await loginAsAdmin(page);
  await page.goto(`${BASE}/warehouse/movements`);
  await page.getByRole('heading', { name: 'Movimientos' }).waitFor();
  await page.getByRole('tab', { name: 'Por movimiento' }).waitFor();
}

describe('Warehouse history E2E', () => {
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

  it('redirects a guest away from the history to login', async () => {
    await page.goto(`${BASE}/warehouse/movements`);
    await page.waitForURL('**/auth/login');
    expect(page.url()).toBe(`${BASE}/auth/login`);
  });

  it('opens the history from the single Movimientos nav link', async () => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/warehouse`);

    await page.getByRole('link', { name: 'Movimientos' }).click();
    await page.waitForURL(`${BASE}/warehouse/movements`);
    await page.getByRole('heading', { name: 'Movimientos' }).waitFor();
    await page.getByText('No se encontraron movimientos').waitFor();
  });

  it('switches between movements and elements tabs', async () => {
    await openMovements(page);

    await page.getByRole('tab', { name: 'Por elemento' }).click();
    await page.waitForURL(`${BASE}/warehouse/entries`);
    await page.getByRole('heading', { name: 'Elementos' }).waitFor();
    await page.getByText('No se encontraron elementos').waitFor();

    await page.getByRole('tab', { name: 'Por movimiento' }).click();
    await page.waitForURL(`${BASE}/warehouse/movements`);
    await page.getByRole('heading', { name: 'Movimientos' }).waitFor();
  });

  it('aligns the tabs with the results count', async () => {
    await openMovements(page);

    const count = await page.locator('[data-slot=warehouse-history-count]').boundingBox();
    const tabs = await page.getByRole('tablist', { name: 'Vistas del historial' }).boundingBox();

    expect(count).not.toBeNull();
    expect(tabs).not.toBeNull();

    if (count && tabs) {
      expect(Math.abs(count.y - tabs.y)).toBeLessThan(20);
      expect(tabs.x).toBeGreaterThan(count.x);
    }
  });

  it('applies and removes a type filter', async () => {
    await openMovements(page);

    await page.locator('#history-sidebar-type').click();
    await page.getByRole('option', { name: 'Recepción' }).click();
    await page.waitForFunction(() => window.location.search.includes('type=assign'));

    const chip = page.getByRole('button', { name: 'Quitar filtro Recepción' });
    await chip.waitFor();
    await chip.click();
    await page.waitForFunction(() => !window.location.search.includes('type='));
  });

  it('keeps the filters when switching tabs', async () => {
    await openMovements(page);

    await page.locator('#history-sidebar-type').click();
    await page.getByRole('option', { name: 'Transferencia' }).click();
    await page.waitForFunction(() => window.location.search.includes('type=move'));

    await page.waitForFunction(() => {
      const link = document.querySelector<HTMLAnchorElement>(
        'a[role="tab"][href*="/warehouse/entries"]',
      );
      return link?.getAttribute('href')?.includes('type=move') ?? false;
    });

    await page.getByRole('tab', { name: 'Por elemento' }).click();
    await page.waitForURL(/\/warehouse\/entries\?.*type=move/);
    await page.getByRole('heading', { name: 'Elementos' }).waitFor();
  });

  it('searches and clears the search from the empty state', async () => {
    await openMovements(page);

    await page.getByLabel('Buscar en movimientos').fill('A29');
    await page.waitForFunction(() => window.location.search.includes('q=A29'));

    await page.getByRole('button', { name: 'Limpiar búsqueda y filtros' }).click();
    await page.waitForFunction(() => !window.location.search.includes('q='));
    await page.waitForFunction(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[aria-label="Buscar en movimientos"]',
      );
      return input?.value === '';
    });
    expect(await page.getByLabel('Buscar en movimientos').inputValue()).toBe('');
  });

  it('shows the filter drawer on mobile', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMovements(page);

    await page.getByRole('button', { name: 'Filtros', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('heading', { name: 'Filtros' }).waitFor();
    await dialog.locator('#history-drawer-type').waitFor();
  });
});
