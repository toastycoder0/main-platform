import { createHash } from 'node:crypto';
import type { Browser, Page } from 'playwright';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BASE, createBrowser, createPage, loginAs } from '../test-utils/browser';

const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

const PRODUCT_ID = 'prd_e2e_cart';
const VARIANT_ID = 'pitem_e2e_cart';
const CART_ID = 'cart_e2e_admin';
const PROFILE = { alias: 'E2E Perfil fiscal', rfc: 'EMP010101AAA' };

const BILLING = {
  userId: '',
  invoice: {
    businessName: 'Empresa E2E S.A. de C.V.',
    rfc: PROFILE.rfc,
    zipCode: '06000',
    taxRegimen: '601',
    cfdiUse: 'G03',
    rfcKey: '',
  },
};

const DELIVERY = {
  type: 'warehouse',
  notes: '',
  reservationHours: null,
  warehouse: {
    office: 'Tezoyuca',
    licensePlate: 'ABC123',
    vehicle: 'Camioneta',
    driver: 'Juan Pérez',
    dateOfRecolection: '2030-01-15',
  },
};

let sql: ReturnType<typeof postgres> | undefined;
let adminId = '';

function db(): ReturnType<typeof postgres> {
  if (!sql) {
    throw new Error('La conexión a la base de datos no está inicializada');
  }
  return sql;
}

async function seedCatalog(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not available to the e2e worker');
  }
  const conn = postgres(url);
  sql = conn;

  const [admin] = await conn<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${ADMIN_EMAIL}`;
  adminId = admin?.id ?? '';
  BILLING.userId = adminId;

  await conn`INSERT INTO product_unit (id, slug, name) VALUES ('unit_e2e_cart', 'e2e-cart-unit', 'E2E Unidad') ON CONFLICT DO NOTHING`;
  await conn`INSERT INTO product (id, slug, title, unit_id, base_currency) VALUES (${PRODUCT_ID}, 'e2e-cart-product', 'E2E Producto carrito', 'unit_e2e_cart', 'MXN') ON CONFLICT DO NOTHING`;
  await conn`INSERT INTO product_item (id, product_id, title, code, manages_inventory) VALUES (${VARIANT_ID}, ${PRODUCT_ID}, 'Única', 'E2E-CART', false) ON CONFLICT DO NOTHING`;
  await conn`INSERT INTO user_tax_profile (id, user_id, alias, legal_name, rfc, cfdi_use, tax_regime, tax_postal_code) VALUES ('taxp_e2e_cart', ${adminId}, ${PROFILE.alias}, ${BILLING.invoice.businessName}, ${PROFILE.rfc}, 'G03', '601', '06000') ON CONFLICT DO NOTHING`;
}

async function resetCart(draft: { billing?: object; delivery?: object } = {}): Promise<void> {
  const conn = db();
  const configHash = createHash('sha256').update('{}').digest('hex');

  await conn`DELETE FROM cart WHERE user_id = ${adminId}`;
  await conn`INSERT INTO cart (id, user_id, billing, delivery) VALUES (${CART_ID}, ${adminId}, ${draft.billing ? conn.json(JSON.parse(JSON.stringify(draft.billing))) : null}, ${draft.delivery ? conn.json(JSON.parse(JSON.stringify(draft.delivery))) : null})`;
  await conn`INSERT INTO cart_item (id, cart_id, product_id, variant_id, quantity, fields, config_hash) VALUES ('citem_e2e_cart', ${CART_ID}, ${PRODUCT_ID}, ${VARIANT_ID}, 1, '{}'::jsonb, ${configHash})`;
}

function collectHydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

describe('Cart checkout E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    await seedCatalog();
    browser = await createBrowser();
  });

  beforeEach(async () => {
    await resetCart();
    page = await createPage(browser);
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL(`${BASE}/`);
  });

  afterAll(async () => {
    await browser.close();
    await db()`DELETE FROM "order" WHERE user_id = ${adminId}`;
    await db()`DELETE FROM cart WHERE user_id = ${adminId}`;
    await db().end();
  });

  it('sends a step that is not reachable yet to the first incomplete one', async () => {
    await page.goto(`${BASE}/cart/review`);

    await page.waitForURL(`${BASE}/cart/billing`);
    expect(page.url()).toBe(`${BASE}/cart/billing`);
  });

  it('clears a field error while typing, without submitting again', async () => {
    await page.goto(`${BASE}/cart/billing`);
    await page.getByRole('button', { name: 'Continuar' }).click();

    const businessName = page.locator('#invoice-businessName');
    await expect.poll(() => businessName.getAttribute('aria-invalid')).toBe('true');

    await businessName.fill('Empresa E2E');

    await expect.poll(() => businessName.getAttribute('aria-invalid')).toBe('false');
  });

  it('reloads a step with errors without hydration mismatches', async () => {
    const errors = collectHydrationErrors(page);

    await page.goto(`${BASE}/cart/billing`);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.locator('#invoice-businessName[aria-invalid=true]').waitFor();

    await page.reload();
    await page.locator('#invoice-businessName').waitFor();

    expect(errors).toEqual([]);
  });

  it('saves the billing step on the server so it survives a reload', async () => {
    await page.goto(`${BASE}/cart/billing`);
    await page.getByText(PROFILE.alias, { exact: true }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.waitForURL(`${BASE}/cart/delivery`);
    await page.reload();
    expect(page.url()).toBe(`${BASE}/cart/delivery`);

    await page.getByRole('link', { name: 'Atrás' }).click();
    await page.waitForURL(`${BASE}/cart/billing`);
    expect(await page.locator('#invoice-rfc').inputValue()).toBe(PROFILE.rfc);
  });

  it('confirms the order from the review and empties the cart', async () => {
    await resetCart({ billing: BILLING, delivery: DELIVERY });

    await page.goto(`${BASE}/cart/review`);
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();

    await page.waitForURL(/\/orders\/ord_/);
    await page.getByRole('heading', { name: 'Página no encontrada' }).waitFor();

    const orders = await db()`SELECT id FROM "order" WHERE user_id = ${adminId}`;
    const items = await db()`SELECT id FROM cart_item WHERE cart_id = ${CART_ID}`;
    expect(orders.length).toBeGreaterThan(0);
    expect(items).toHaveLength(0);
  });
});
