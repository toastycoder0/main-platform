import type { Browser, Page } from 'playwright';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BASE, createBrowser, createPage, loginAs } from '../test-utils/browser';

const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

const DETAIL_SLUG_PREFIX = 'e2e-movement-detail-';
const DETAIL_LOT_PREFIX = 'E2E-MOV-';
const DETAIL_NOTE_PREFIX = 'E2E Detalle ';

interface MovementFixture {
  movementId: string;
  sequentialNumber: number;
  note: string;
  lotCode: string;
  productTitle: string;
}

let sql: ReturnType<typeof postgres> | undefined;
let fixture: MovementFixture | undefined;

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

function db(): ReturnType<typeof postgres> {
  if (!sql) {
    throw new Error('La conexión a la base de datos no está inicializada');
  }
  return sql;
}

function requireFixture(): MovementFixture {
  if (!fixture) {
    throw new Error('El movimiento de prueba no está creado');
  }
  return fixture;
}

/** Removes the fixture (also leftovers of an interrupted run) so the history
 *  empty-state assertions of this file keep holding on every run. */
async function purgeMovementFixture(): Promise<void> {
  const conn = db();
  const notePattern = `${DETAIL_NOTE_PREFIX}%`;
  const lotPattern = `${DETAIL_LOT_PREFIX}%`;
  const slugPattern = `${DETAIL_SLUG_PREFIX}%`;

  await conn`
    DELETE FROM movement_entry
    WHERE movement_id IN (
      SELECT id FROM movement
      WHERE note LIKE ${notePattern}
         OR reverts_id IN (SELECT id FROM movement WHERE note LIKE ${notePattern})
    )
  `;
  await conn`
    DELETE FROM movement
    WHERE note LIKE ${notePattern}
       OR reverts_id IN (SELECT id FROM movement WHERE note LIKE ${notePattern})
  `;
  await conn`
    DELETE FROM cell_lot
    WHERE lot_id IN (SELECT id FROM lot WHERE code LIKE ${lotPattern})
  `;
  await conn`DELETE FROM lot WHERE code LIKE ${lotPattern}`;
  await conn`DELETE FROM product WHERE slug LIKE ${slugPattern}`;
}

/** Seeds product → lot → stock → assign movement directly: the detail page is
 *  what this suite exercises, while the revert itself still runs through the
 *  real engine (hence the matching `cell_lot` balance). */
async function seedMovementFixture(): Promise<void> {
  const conn = db();
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const note = `${DETAIL_NOTE_PREFIX}${suffix}`;
  const lotCode = `${DETAIL_LOT_PREFIX}${suffix}`;
  const productTitle = `Producto ${note}`;

  const users = await conn`SELECT id FROM "user" WHERE email = ${ADMIN_EMAIL}`;
  const units = await conn`SELECT id FROM product_unit WHERE slug = 'm2' LIMIT 1`;
  const cells = await conn`SELECT id FROM warehouse_cell WHERE code = 'A5' LIMIT 1`;

  const adminId: string | undefined = users[0]?.id;
  const unitId: string | undefined = units[0]?.id;
  const cellId: string | undefined = cells[0]?.id;

  if (!adminId || !unitId || !cellId) {
    throw new Error('Faltan datos sembrados para el detalle de movimiento');
  }

  const productId = `prd_e2e_${suffix}`;
  const itemId = `pitem_e2e_${suffix}`;
  const lotId = `lot_e2e_${suffix}`;
  const movementId = `mov_e2e_${suffix}`;
  const entryId = `mve_e2e_${suffix}`;

  await conn`
    INSERT INTO product (id, slug, title, unit_id, base_currency)
    VALUES (${productId}, ${`${DETAIL_SLUG_PREFIX}${suffix}`}, ${productTitle}, ${unitId}, 'MXN')
  `;
  await conn`
    INSERT INTO product_item (id, product_id, title, code)
    VALUES (${itemId}, ${productId}, 'Variante E2E', ${`E2E-VAR-${suffix}`})
  `;
  await conn`
    INSERT INTO lot (id, item_id, code, normalized_code)
    VALUES (${lotId}, ${itemId}, ${lotCode}, ${lotCode.toLowerCase()})
  `;
  await conn`
    INSERT INTO cell_lot (cell_id, lot_id, quantity)
    VALUES (${cellId}, ${lotId}, '10')
  `;

  const movements = await conn`
    INSERT INTO movement (id, type, reason, user_id, note)
    VALUES (${movementId}, 'assign', 'reception', ${adminId}, ${note})
    RETURNING sequential_number
  `;
  const sequentialNumber: number | undefined = movements[0]?.sequential_number;

  if (typeof sequentialNumber !== 'number') {
    throw new Error('No se pudo crear el movimiento de prueba');
  }

  await conn`
    INSERT INTO movement_entry (id, movement_id, lot_id, destination_cell_id, quantity)
    VALUES (${entryId}, ${movementId}, ${lotId}, ${cellId}, '10')
  `;

  fixture = { movementId, sequentialNumber, note, lotCode, productTitle };
}

describe('Warehouse history E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await createBrowser();

    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not available to the e2e worker');
    }
    sql = postgres(url);
    await purgeMovementFixture();
  });

  beforeEach(async () => {
    page = await createPage(browser);
  });

  afterAll(async () => {
    await browser.close();
    await sql?.end();
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

  it('selects a two-date range', async () => {
    await openMovements(page);

    await page.getByRole('button', { name: 'Cualquier fecha' }).click();
    const days = page.locator('.rdp-root button[data-day]');
    await days.nth(10).click();
    await days.nth(15).click();

    await page.waitForFunction(() => {
      const params = new URLSearchParams(window.location.search);
      const from = params.get('from');
      const to = params.get('to');
      return Boolean(from && to && from !== to);
    });
  });

  it('selects multiple movements', async () => {
    await openMovements(page);

    await page.getByRole('checkbox', { name: 'Asignación de celda' }).check();
    await page.getByRole('checkbox', { name: 'Movimiento entre celdas' }).check();
    await page.waitForFunction(
      () => new URLSearchParams(window.location.search).get('movements') === 'reception,transfer',
    );

    await page.getByRole('button', { name: 'Quitar filtro Asignación de celda' }).click();
    await page.waitForFunction(
      () => new URLSearchParams(window.location.search).get('movements') === 'transfer',
    );

    await page.getByRole('button', { name: 'Quitar filtro Movimiento entre celdas' }).click();
    await page.waitForFunction(() => !new URLSearchParams(window.location.search).has('movements'));
  });

  it('applies and removes a movement filter', async () => {
    await openMovements(page);

    await page.getByRole('checkbox', { name: 'Asignación de celda' }).check();
    await page.waitForFunction(
      () => new URLSearchParams(window.location.search).get('movements') === 'reception',
    );

    const chip = page.getByRole('button', { name: 'Quitar filtro Asignación de celda' });
    await chip.waitFor();
    await chip.click();
    await page.waitForFunction(() => !new URLSearchParams(window.location.search).has('movements'));
  });

  it('keeps the filters when switching tabs', async () => {
    await openMovements(page);

    await page.getByRole('checkbox', { name: 'Movimiento entre celdas' }).check();
    await page.waitForFunction(
      () => new URLSearchParams(window.location.search).get('movements') === 'transfer',
    );

    await page.waitForFunction(() => {
      const link = document.querySelector<HTMLAnchorElement>(
        'a[role="tab"][href*="/warehouse/entries"]',
      );
      const href = link?.getAttribute('href');
      return href ? decodeURIComponent(href).includes('movements=transfer') : false;
    });

    await page.getByRole('tab', { name: 'Por elemento' }).click();
    await page.waitForURL(/\/warehouse\/entries\?.*movements=transfer/);
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
    await dialog.getByRole('checkbox', { name: 'Asignación de celda' }).waitFor();
  });

  describe('movement detail and revert', () => {
    beforeAll(async () => {
      await seedMovementFixture();
    });

    afterAll(async () => {
      await purgeMovementFixture();
    });

    it('renders the 404 page for an unknown movement', async () => {
      await loginAsAdmin(page);
      await page.goto(`${BASE}/warehouse/movements/mov_does_not_exist`);
      await page.getByRole('heading', { name: 'Página no encontrada' }).waitFor();
    });

    it('redirects a guest away from the detail to login', async () => {
      await page.goto(`${BASE}/warehouse/movements/${requireFixture().movementId}`);
      await page.waitForURL('**/auth/login');
      expect(page.url()).toBe(`${BASE}/auth/login`);
    });

    it('opens the detail from the movements list row', async () => {
      const { movementId, sequentialNumber, note, lotCode, productTitle } = requireFixture();
      await openMovements(page);

      await page.getByRole('link', { name: `#${sequentialNumber}` }).click();
      await page.waitForURL(`${BASE}/warehouse/movements/${movementId}`);

      await page.getByRole('heading', { name: `Movimiento #${sequentialNumber}` }).waitFor();
      await page.getByText('Asignación de celda', { exact: true }).waitFor();
      await page.getByText(note, { exact: true }).waitFor();
      await page.getByText(lotCode, { exact: true }).waitFor();
      await page.getByText(productTitle, { exact: true }).waitFor();
      await page.getByRole('complementary').getByText('John Doe').waitFor();
      expect(await page.getByText('A5', { exact: true }).count()).toBe(1);
      expect(await page.getByRole('link', { name: 'Volver a movimientos' }).isVisible()).toBe(true);
      expect(await page.getByRole('button', { name: 'Revertir' }).count()).toBe(1);
      expect(await page.getByText('Revertido', { exact: true }).count()).toBe(0);
    });

    it('reverts from the detail and links both movements', async () => {
      const { movementId, sequentialNumber, note } = requireFixture();
      await loginAsAdmin(page);
      await page.goto(`${BASE}/warehouse/movements/${movementId}`);
      await page.getByRole('heading', { name: /Movimiento #/ }).waitFor();

      await page.getByRole('button', { name: 'Revertir' }).click();

      // The confirmation uses an AlertDialog, whose Radix role is `alertdialog`.
      const dialog = page.getByRole('alertdialog');
      await dialog
        .getByRole('heading', { name: `¿Revertir el movimiento #${sequentialNumber}?` })
        .waitFor();
      await dialog.getByRole('button', { name: 'Sí, revertir' }).click();

      await page.getByText('Movimiento revertido').waitFor();
      await page.getByText('Revertido', { exact: true }).waitFor();
      expect(await page.getByRole('button', { name: 'Revertir' }).count()).toBe(0);
      expect(await page.getByText(note, { exact: true }).count()).toBe(1);

      const reversalLink = page.getByRole('link', { name: /Revertido por/ });
      await reversalLink.click();
      await page.waitForFunction(
        (baseId) => window.location.pathname !== `/warehouse/movements/${baseId}`,
        movementId,
      );

      await page.getByText('Reversión', { exact: true }).waitFor();
      await page.getByRole('link', { name: /Reversión de/ }).waitFor();
      expect(await page.getByRole('button', { name: 'Revertir' }).count()).toBe(0);
    });
  });
});
