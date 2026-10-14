import type { Browser, Locator, Page } from 'playwright';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BASE, createBrowser, createPage, loginAs } from '../test-utils/browser';

const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';
const LIST_URL = `${BASE}/dashboard/products`;

const REQUIRED = 'El campo es requerido';
const SEEDED_BRAND = 'E2E Marca';
const SEEDED_TAGS = ['E2E Tag A', 'E2E Tag B'];
const SEEDED_CATEGORIES = ['E2E Categoría Uno', 'E2E Categoría Dos'];

const PDF = {
  name: 'ficha.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%%EOF'),
};
const PNG = {
  name: 'foto.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  ),
};

const GALLERY_INPUT = 'input[type=file][accept*="image"]';

let sql: ReturnType<typeof postgres> | undefined;
let counter = 0;

function uniqueTitle(label: string): string {
  counter += 1;
  return `E2E ${label} ${Date.now().toString(36)}${counter}`;
}

async function seedCatalogs(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not available to the e2e worker');
  }
  sql = postgres(url);

  await sql`INSERT INTO brand (id, slug, name) VALUES ('brd_e2e_marca', 'e2e-marca', ${SEEDED_BRAND}) ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO tag (id, slug, name) VALUES ('tag_e2e_a', 'e2e-tag-a', ${SEEDED_TAGS[0] ?? ''}), ('tag_e2e_b', 'e2e-tag-b', ${SEEDED_TAGS[1] ?? ''}) ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO category (id, slug, name, path) VALUES ('cat_e2e_uno', 'e2e-uno', ${SEEDED_CATEGORIES[0] ?? ''}, 'cat_e2e_uno'), ('cat_e2e_dos', 'e2e-dos', ${SEEDED_CATEGORIES[1] ?? ''}, 'cat_e2e_dos') ON CONFLICT DO NOTHING`;
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

async function openNewProduct(page: Page) {
  await page.goto(`${LIST_URL}/new`);
  await page.waitForSelector('#product-form');
}

async function submitForm(page: Page) {
  await page.click('#product-form button[type="submit"]');
}

async function waitForList(page: Page) {
  await page.waitForURL(LIST_URL);
  await page.waitForSelector('[data-slot=table-body]');
}

async function searchInList(page: Page, title: string) {
  await page.goto(`${LIST_URL}?q=${encodeURIComponent(title)}`);
  await page.waitForSelector('[data-slot=table-body], [data-slot=list-empty]');
}

async function openEdit(page: Page, title: string) {
  await searchInList(page, title);
  await page.getByLabel(`Acciones de ${title}`).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await page.waitForURL('**/dashboard/products/form/**');
  await page.waitForSelector('#product-form');
}

/** Radix select: the trigger carries the label, options render in a portal. */
async function chooseSelect(page: Page, trigger: Locator, option: string) {
  await trigger.click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** Base UI combobox: type to filter, then pick the matching option. */
async function chooseCombobox(page: Page, input: Locator, search: string, option = search) {
  await input.click();
  await input.fill(search);
  await page.getByRole('option', { name: option, exact: true }).click();
}

function item(page: Page, title: string): Locator {
  return page
    .locator('[data-slot=collection-item]')
    .filter({ has: page.getByText(title, { exact: true }) });
}

function variantCard(page: Page, index: number): Locator {
  return page
    .locator('[data-slot=collection-item]')
    .filter({ has: page.locator(`#form-variants-${index}-title`) });
}

async function createProduct(
  page: Page,
  title: string,
  options: { code?: string } = {},
): Promise<void> {
  await openNewProduct(page);
  await page.locator('#form-product-title').fill(title);
  await page.locator('#form-variants-0-code').fill(options.code ?? `SKU-${title}`);
  await submitForm(page);
  await waitForList(page);
}

async function toastText(page: Page): Promise<string> {
  const toast = page.locator('[data-sonner-toast]').first();
  await toast.waitFor();
  return (await toast.textContent()) ?? '';
}

describe('Products E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await createBrowser();
    await seedCatalogs();
  });

  beforeEach(async () => {
    page = await createPage(browser);
  });

  afterAll(async () => {
    await browser.close();
    await sql?.end();
  });

  describe('access and list', () => {
    it('redirects a guest away from the products page to login', async () => {
      await page.goto(LIST_URL);
      await page.waitForURL('**/auth/login');
      expect(page.url()).toBe(`${BASE}/auth/login`);
    });

    it('redirects a guest away from the new product page to login', async () => {
      await page.goto(`${LIST_URL}/new`);
      await page.waitForURL('**/auth/login');
      expect(page.url()).toBe(`${BASE}/auth/login`);
    });

    it('redirects a guest away from the edit product page to login', async () => {
      await page.goto(`${LIST_URL}/form/prd-any`);
      await page.waitForURL('**/auth/login');
      expect(page.url()).toBe(`${BASE}/auth/login`);
    });

    it('renders the list for an admin without console errors', async () => {
      await loginAsAdmin(page);
      const consoleErrors = collectConsoleErrors(page);

      await page.goto(LIST_URL);
      await page.waitForSelector('h1:has-text("Gestión de productos")');
      await page.waitForSelector('[data-slot=table-body], [data-slot=list-empty]');

      expect(await page.getByRole('link', { name: 'Crear producto' }).isVisible()).toBe(true);
      expect(consoleErrors).toEqual([]);
    });

    it('shows the empty state when the search matches nothing', async () => {
      await loginAsAdmin(page);
      await page.goto(`${LIST_URL}?q=zzz-no-existe`);
      await page.locator('[data-slot=list-empty]').waitFor();
      expect(await page.getByText('No se encontraron productos').isVisible()).toBe(true);
    });

    it('opens the creation form from the toolbar button', async () => {
      await loginAsAdmin(page);
      await page.goto(LIST_URL);
      await page.getByRole('link', { name: 'Crear producto' }).click();
      await page.waitForURL('**/dashboard/products/new');
      await page.waitForSelector('#product-form');
      expect(await page.getByRole('heading', { name: 'Crear producto' }).isVisible()).toBe(true);
    });

    it('renders the 404 page when editing a product that does not exist', async () => {
      await loginAsAdmin(page);
      await page.goto(`${LIST_URL}/form/prd_does_not_exist`);
      await page.getByRole('heading', { name: 'Página no encontrada' }).waitFor();
    });
  });

  describe('new product form defaults', () => {
    beforeEach(async () => {
      await loginAsAdmin(page);
      await openNewProduct(page);
    });

    it('renders every section with its defaults', async () => {
      expect(await page.locator('#form-product-title').inputValue()).toBe('');
      await page.locator('#form-product-status').filter({ hasText: 'Activo' }).waitFor();
      await page
        .locator('#form-product-base-currency')
        .filter({ hasText: 'Peso Mexicano' })
        .waitFor();
      expect(await page.locator('#form-product-unit').inputValue()).toBe('Metro cuadrado');

      for (const heading of [
        'Precios',
        'Variantes',
        'Galería',
        'Detalles técnicos',
        'Documentos',
        'Productos relacionados',
        'Productos complementarios',
      ]) {
        expect(await page.getByRole('heading', { name: heading }).isVisible()).toBe(true);
      }

      expect(await page.getByText('Sin detalles registrados.').isVisible()).toBe(true);
      expect(await page.getByText('Sin documentos registrados.').isVisible()).toBe(true);
      expect(await page.getByText('Sin imágenes registradas.').isVisible()).toBe(true);
      expect(await page.getByText('Sin productos relacionados.').isVisible()).toBe(true);
      expect(await page.getByText('Sin productos complementarios.').isVisible()).toBe(true);
    });

    it('starts with one default variant that cannot be removed', async () => {
      expect(await page.locator('#form-variants-0-title').inputValue()).toBe('Estándar');
      expect(await page.getByText('Predeterminada', { exact: true }).isVisible()).toBe(true);
      expect(await page.locator('#form-variants-0-minOrderQty').inputValue()).toBe('1');
      expect(await page.locator('#form-variants-0-incrementQty').inputValue()).toBe('1');
      expect(await page.locator('#form-variants-0-leadTimeDays').inputValue()).toBe('0');

      expect(
        await variantCard(page, 0).getByRole('button', { name: 'Eliminar', exact: true }).count(),
      ).toBe(0);
    });

    it('lists a price input per price list', async () => {
      for (const index of [0, 1, 2]) {
        expect(await page.locator(`#prices-${index}-amount`).isVisible()).toBe(true);
      }
      expect(await page.locator('#prices-0-amount').inputValue()).toBe('');
    });

    it('lists the seeded catalogs in the comboboxes', async () => {
      await page.locator('#form-product-brand').click();
      expect(await page.getByRole('option', { name: SEEDED_BRAND }).isVisible()).toBe(true);
      await page.keyboard.press('Escape');

      await page.getByPlaceholder('Buscar tags...').click();
      for (const tagName of SEEDED_TAGS) {
        expect(await page.getByRole('option', { name: tagName }).isVisible()).toBe(true);
      }
    });

    it('returns to the list from the cancel link', async () => {
      await page.getByRole('link', { name: 'Cancelar' }).click();
      await page.waitForURL(LIST_URL);
    });
  });

  describe('validation', () => {
    beforeEach(async () => {
      await loginAsAdmin(page);
      await openNewProduct(page);
    });

    it('blocks an empty submit and reports the required fields', async () => {
      await page.locator('#form-variants-0-code').fill('');
      await submitForm(page);

      await page.getByText(REQUIRED).first().waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
      expect(await page.locator('#form-product-title').getAttribute('aria-invalid')).toBe('true');
      expect(await page.locator('#form-variants-0-code').getAttribute('aria-invalid')).toBe('true');
    });

    it('clears the error once the field is fixed', async () => {
      await submitForm(page);
      await page.locator('#form-product-title[aria-invalid="true"]').waitFor();

      await page.locator('#form-product-title').fill('Producto corregido');
      await page.locator('#form-product-title:not([aria-invalid="true"])').waitFor();
    });

    it('requires a unit of measure', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Sin unidad'));
      await page.locator('#form-variants-0-code').fill('SKU-NOUNIT');
      await page.locator('[data-slot=combobox-clear]').first().waitFor();
      await page
        .locator('#form-product-unit')
        .locator('xpath=..')
        .locator('[data-slot=combobox-clear]')
        .click();
      await submitForm(page);

      await page.getByText(REQUIRED).first().waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
    });

    it('limits the length of the title', async () => {
      await page.locator('#form-product-title').fill('a'.repeat(201));
      await submitForm(page);
      await page.getByText('El texto excede el número máximo de caracteres').first().waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
    });

    it('requires cost and cost currency together', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Costo'));
      await page.locator('#form-variants-0-code').fill('SKU-COST');
      await page.locator('#form-cost').fill('25.5');
      await submitForm(page);

      const message = 'Costo y moneda de costo deben completarse ambos';
      await page.getByText(message).first().waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);

      await chooseCombobox(page, page.locator('#form-product-cost-currency'), 'US Dollar');
      await page.getByText(message).first().waitFor({ state: 'detached' });
    });

    it('requires cost when only the cost currency is chosen', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Moneda'));
      await page.locator('#form-variants-0-code').fill('SKU-CUR');
      await chooseCombobox(page, page.locator('#form-product-cost-currency'), 'US Dollar');
      await submitForm(page);

      await page.getByText('Costo y moneda de costo deben completarse ambos').first().waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
    });

    it('rejects a negative cost and an out-of-range tax rate', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Rangos'));
      await page.locator('#form-variants-0-code').fill('SKU-RANGE');
      await page.locator('#form-cost').fill('-5');
      await chooseCombobox(page, page.locator('#form-product-cost-currency'), 'US Dollar');
      await page.locator('#form-taxRate').fill('150');
      await submitForm(page);

      await page.getByText('El costo no puede ser negativo').waitFor();
      await page.getByText('La tasa no puede ser mayor a 100').waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
    });

    it('rejects a negative price', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Precio'));
      await page.locator('#form-variants-0-code').fill('SKU-PRICE');
      await page.locator('#prices-0-amount').fill('-1');
      await submitForm(page);

      await page.getByText('El precio debe ser mayor o igual a 0').waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
    });

    it('does not turn an emptied cost into zero', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Costo vacío'));
      await page.locator('#form-variants-0-code').fill('SKU-EMPTY');
      await page.locator('#form-cost').fill('10');
      await page.locator('#form-cost').fill('');
      await submitForm(page);

      // Cleared cost plus no currency is a valid combination.
      await waitForList(page);
    });
  });

  describe('variants', () => {
    beforeEach(async () => {
      await loginAsAdmin(page);
      await openNewProduct(page);
    });

    it('adds and removes variants', async () => {
      await page.getByRole('button', { name: 'Agregar variante' }).click();
      await page.locator('#form-variants-1-title').waitFor();
      expect(await page.getByText('Variante 2').isVisible()).toBe(true);

      await variantCard(page, 1).getByRole('button', { name: 'Eliminar', exact: true }).click();
      await page.locator('#form-variants-1-title').waitFor({ state: 'detached' });
    });

    it('rejects repeated variant codes', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Códigos'));
      await page.locator('#form-variants-0-code').fill('SKU-DUP');
      await page.getByRole('button', { name: 'Agregar variante' }).click();
      await page.locator('#form-variants-1-title').fill('Segunda');
      await page.locator('#form-variants-1-code').fill('sku-dup');
      await submitForm(page);

      await page.getByText('El código ya está en uso en otra variante').waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
    });

    it('requires a formula when the pricing model is a formula', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Fórmula'));
      await page.locator('#form-variants-0-code').fill('SKU-FORM');
      await chooseSelect(
        page,
        page.locator('#form-variants-0-pricingModel'),
        'Fórmula personalizada',
      );
      await page.locator('#form-variants-0-priceFormula').waitFor();
      await submitForm(page);

      await page.getByText('La fórmula es requerida').waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
    });

    it('inserts variables into the formula from the shortcuts', async () => {
      await chooseSelect(
        page,
        page.locator('#form-variants-0-pricingModel'),
        'Fórmula personalizada',
      );
      const formula = page.locator('#form-variants-0-priceFormula');
      await formula.fill('');
      await page.getByRole('button', { name: /^Insertar Precio base del producto/ }).click();
      expect(await formula.inputValue()).toBe('base_price');
    });

    it('derives the option identifier from its label', async () => {
      await page.getByRole('button', { name: 'Agregar opción' }).click();
      await page.locator('#form-variants-0-options-0-label').fill('Ancho (cm)');
      expect(await page.locator('#form-variants-0-options-0-key').inputValue()).toBe('ancho_cm');
    });

    it('validates option identifiers, select choices and number ranges', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Opciones inválidas'));
      await page.locator('#form-variants-0-code').fill('SKU-OPT');

      await page.getByRole('button', { name: 'Agregar opción' }).click();
      await page.locator('#form-variants-0-options-0-label').fill('Acabado');
      await chooseSelect(
        page,
        page.locator('#form-variants-0-options-0-type'),
        'Lista de opciones',
      );

      await page.getByRole('button', { name: 'Agregar opción' }).click();
      await page.locator('#form-variants-0-options-1-label').fill('Ancho');
      await page.locator('#form-variants-0-options-1-key').fill('Ancho Inválido');
      await chooseSelect(page, page.locator('#form-variants-0-options-1-type'), 'Número');
      await page.locator('#form-variants-0-options-1-minValue').fill('10');
      await page.locator('#form-variants-0-options-1-maxValue').fill('2');

      await submitForm(page);

      await page.getByText('Agrega al menos una opción a la lista').waitFor();
      await page
        .getByText('Usa minúsculas, números y guiones bajos, iniciando con una letra')
        .waitFor();
      await page.getByText('El máximo debe ser mayor o igual al mínimo').waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
    });

    it('rejects repeated option identifiers inside a variant', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Llaves'));
      await page.locator('#form-variants-0-code').fill('SKU-KEYS');
      for (const index of [0, 1]) {
        await page.getByRole('button', { name: 'Agregar opción' }).click();
        await page.locator(`#form-variants-0-options-${index}-label`).fill(`Opción ${index}`);
        await page.locator(`#form-variants-0-options-${index}-key`).fill('misma');
      }
      await submitForm(page);

      await page.getByText('El identificador ya está en uso en esta variante').waitFor();
    });

    it('manages select choices', async () => {
      await page.getByRole('button', { name: 'Agregar opción' }).click();
      await chooseSelect(
        page,
        page.locator('#form-variants-0-options-0-type'),
        'Lista de opciones',
      );
      await page.getByRole('button', { name: 'Agregar valor' }).click();
      await page.getByRole('button', { name: 'Agregar valor' }).click();
      await page.locator('#form-variants-0-options-0-choice-1').waitFor();

      await page.getByRole('button', { name: 'Quitar valor 1' }).click();
      await page.locator('#form-variants-0-options-0-choice-1').waitFor({ state: 'detached' });
    });

    it('shows number bounds only for number options', async () => {
      await page.getByRole('button', { name: 'Agregar opción' }).click();
      expect(await page.locator('#form-variants-0-options-0-minValue').count()).toBe(0);
      await chooseSelect(page, page.locator('#form-variants-0-options-0-type'), 'Número');
      await page.locator('#form-variants-0-options-0-minValue').waitFor();
    });

    it('rejects quantities below the minimum', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Cantidades'));
      await page.locator('#form-variants-0-code').fill('SKU-QTY');
      await page.locator('#form-variants-0-minOrderQty').fill('0');
      await submitForm(page);

      await page.getByText('La cantidad mínima es 1').waitFor();
    });
  });

  describe('details, documents and related products', () => {
    beforeEach(async () => {
      await loginAsAdmin(page);
      await openNewProduct(page);
    });

    it('adds, validates and removes technical details', async () => {
      await page.getByRole('button', { name: 'Agregar detalle' }).click();
      await page.getByRole('button', { name: 'Agregar detalle' }).click();
      expect(await page.getByText('Detalle 2', { exact: true }).isVisible()).toBe(true);

      await page.locator('#form-product-title').fill(uniqueTitle('Detalles'));
      await page.locator('#form-variants-0-code').fill('SKU-DET');
      await submitForm(page);
      await page.getByText(REQUIRED).first().waitFor();

      await item(page, 'Detalle 2').getByRole('button', { name: 'Eliminar', exact: true }).click();
      await item(page, 'Detalle 1').getByRole('button', { name: 'Eliminar', exact: true }).click();
      expect(await page.getByText('Sin detalles registrados.').isVisible()).toBe(true);
    });

    it('stops adding details at the limit', async () => {
      const add = page.getByRole('button', { name: 'Agregar detalle' });
      for (let i = 0; i < 20; i++) {
        await add.click();
      }
      expect(await add.isDisabled()).toBe(true);
    });

    it('requires a label for a document and lets it be removed', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Documento'));
      await page.locator('#form-variants-0-code').fill('SKU-DOC');
      await page.getByRole('button', { name: 'Agregar documento' }).click();
      await item(page, 'Documento 1')
        .getByRole('combobox')
        .filter({ hasText: 'Información técnica' })
        .waitFor();

      await submitForm(page);
      await page.getByText(REQUIRED).first().waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);

      await item(page, 'Documento 1')
        .getByRole('button', { name: 'Eliminar', exact: true })
        .click();
      expect(await page.getByText('Sin documentos registrados.').isVisible()).toBe(true);
    });

    it('stops adding documents at the limit', async () => {
      const add = page.getByRole('button', { name: 'Agregar documento' });
      for (let i = 0; i < 10; i++) {
        await add.click();
      }
      expect(await add.isDisabled()).toBe(true);
    });

    it('requires a product for a related entry', async () => {
      await page.locator('#form-product-title').fill(uniqueTitle('Relacionado'));
      await page.locator('#form-variants-0-code').fill('SKU-REL');
      await page.getByRole('button', { name: 'Agregar relacionado' }).click();
      await submitForm(page);

      await page.getByText(REQUIRED).first().waitFor();
      await item(page, 'Relacionado 1')
        .getByRole('button', { name: 'Eliminar', exact: true })
        .click();
      expect(await page.getByText('Sin productos relacionados.').isVisible()).toBe(true);
    });
  });

  describe('creating products', () => {
    beforeEach(async () => {
      await loginAsAdmin(page);
    });

    it('creates a minimal product and lists it', async () => {
      const title = uniqueTitle('Mínimo');
      await createProduct(page, title, { code: 'SKU-MIN' });

      await searchInList(page, title);
      expect(await page.getByRole('cell', { name: title, exact: true }).isVisible()).toBe(true);
      expect(await page.getByRole('cell', { name: 'Metro cuadrado' }).isVisible()).toBe(true);
      expect(await page.getByText('Activo', { exact: true }).isVisible()).toBe(true);
    });

    it('trims the title and keeps the product usable with accents', async () => {
      const title = uniqueTitle('Ñandú Canción');
      await createProduct(page, `  ${title}  `);

      await searchInList(page, title);
      expect(await page.getByRole('cell', { name: title, exact: true }).isVisible()).toBe(true);
    });

    it('creates products that share the same title with distinct slugs', async () => {
      const title = uniqueTitle('Repetido');
      await createProduct(page, title, { code: 'SKU-R1' });
      await createProduct(page, title, { code: 'SKU-R2' });

      await searchInList(page, title);
      expect(await page.getByRole('cell', { name: title, exact: true }).count()).toBe(2);
    });

    it('persists every general field', async () => {
      const title = uniqueTitle('General');
      await openNewProduct(page);

      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-product-subtitle').fill('Subtítulo de prueba');
      await page.locator('#form-product-code').fill('GEN-001');
      await chooseSelect(page, page.locator('#form-product-status'), 'Solo almacén');
      await page.locator('#form-product-description').fill('Descripción larga del producto');
      await chooseCombobox(page, page.locator('#form-product-brand'), SEEDED_BRAND);
      await chooseCombobox(page, page.locator('#form-product-unit'), 'Caja');
      await chooseSelect(page, page.locator('#form-product-base-currency'), 'US Dollar');
      await page.locator('#form-cost').fill('12.5');
      await chooseCombobox(page, page.locator('#form-product-cost-currency'), 'Peso Mexicano');
      await page.locator('#form-product-sat-id').fill('01010101');
      await page.locator('#form-product-sat-unit').fill('H87');
      await page.locator('#form-product-tax-object').fill('02');
      await page.locator('#form-product-tax-name').fill('IVA');
      await page.locator('#form-taxRate').fill('16');
      await page.locator('#form-variants-0-code').fill('GEN-STD');

      await submitForm(page);
      await waitForList(page);
      await searchInList(page, title);
      expect(await page.getByText('Solo almacén').isVisible()).toBe(true);
      expect(await page.getByRole('cell', { name: SEEDED_BRAND }).isVisible()).toBe(true);
      expect(await page.getByRole('cell', { name: 'Caja' }).isVisible()).toBe(true);
      expect(await page.getByRole('cell', { name: 'GEN-001' }).isVisible()).toBe(true);

      await openEdit(page, title);
      expect(await page.locator('#form-product-title').inputValue()).toBe(title);
      expect(await page.locator('#form-product-subtitle').inputValue()).toBe('Subtítulo de prueba');
      expect(await page.locator('#form-product-code').inputValue()).toBe('GEN-001');
      await page.locator('#form-product-status').filter({ hasText: 'Solo almacén' }).waitFor();
      expect(await page.locator('#form-product-description').inputValue()).toBe(
        'Descripción larga del producto',
      );
      expect(await page.locator('#form-product-brand').inputValue()).toBe(SEEDED_BRAND);
      expect(await page.locator('#form-product-unit').inputValue()).toBe('Caja');
      await page.locator('#form-product-base-currency').filter({ hasText: 'US Dollar' }).waitFor();
      expect(await page.locator('#form-cost').inputValue()).toBe('12.5');
      expect(await page.locator('#form-product-cost-currency').inputValue()).toBe('Peso Mexicano');
      expect(await page.locator('#form-product-sat-id').inputValue()).toBe('01010101');
      expect(await page.locator('#form-product-sat-unit').inputValue()).toBe('H87');
      expect(await page.locator('#form-product-tax-object').inputValue()).toBe('02');
      expect(await page.locator('#form-product-tax-name').inputValue()).toBe('IVA');
      expect(await page.locator('#form-taxRate').inputValue()).toBe('16');
    });

    it('persists tags, categories and prices', async () => {
      const title = uniqueTitle('Clasificación');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('CLA-1');

      const tags = page.getByPlaceholder('Buscar tags...');
      await tags.click();
      await page.getByRole('option', { name: SEEDED_TAGS[0] ?? '' }).click();
      await page.getByRole('option', { name: SEEDED_TAGS[1] ?? '' }).click();
      await page.keyboard.press('Escape');

      const categories = page.getByPlaceholder('Buscar categorías...');
      await categories.click();
      await page.getByRole('option', { name: SEEDED_CATEGORIES[1] ?? '' }).click();
      await page.keyboard.press('Escape');

      await page.locator('#prices-0-amount').fill('100.5');
      await page.locator('#prices-2-amount').fill('0');

      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      for (const name of [...SEEDED_TAGS, SEEDED_CATEGORIES[1] ?? '']) {
        expect(await page.getByText(name, { exact: true }).first().isVisible()).toBe(true);
      }
      expect(await page.getByText(SEEDED_CATEGORIES[0] ?? '', { exact: true }).count()).toBe(0);
      expect(await page.locator('#prices-0-amount').inputValue()).toBe('100.5');
      expect(await page.locator('#prices-1-amount').inputValue()).toBe('');
      expect(await page.locator('#prices-2-amount').inputValue()).toBe('0');
    });

    it('persists technical details in order', async () => {
      const title = uniqueTitle('Detalles guardados');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('DET-1');

      await page.getByRole('button', { name: 'Agregar detalle' }).click();
      await page.getByRole('button', { name: 'Agregar detalle' }).click();
      const first = item(page, 'Detalle 1');
      await first.getByPlaceholder('Ej: Material').fill('Material');
      await first.getByPlaceholder('Ej: Acero inoxidable').fill('Acero');
      const second = item(page, 'Detalle 2');
      await second.getByPlaceholder('Ej: Material').fill('Peso');
      await second.getByPlaceholder('Ej: Acero inoxidable').fill('3 kg');

      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await item(page, 'Detalle 1').getByPlaceholder('Ej: Material').inputValue()).toBe(
        'Material',
      );
      expect(
        await item(page, 'Detalle 2').getByPlaceholder('Ej: Acero inoxidable').inputValue(),
      ).toBe('3 kg');
    });

    it('persists variants with formula pricing and typed options', async () => {
      const title = uniqueTitle('Variantes guardadas');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('VAR-STD');
      await page.locator('#form-variants-0-leadTimeDays').fill('5');

      await page.getByRole('button', { name: 'Agregar variante' }).click();
      await page.locator('#form-variants-1-title').fill('A medida');
      await page.locator('#form-variants-1-code').fill('VAR-MED');
      await page.locator('#form-variants-1-minOrderQty').fill('3');
      await page.locator('#form-variants-1-incrementQty').fill('2');
      await chooseCombobox(page, page.locator('#form-variants-1-unitId'), 'Pieza');
      await page.locator('#form-variants-1-isActive').click();
      await chooseSelect(
        page,
        page.locator('#form-variants-1-pricingModel'),
        'Fórmula personalizada',
      );

      await page.getByRole('button', { name: 'Agregar opción' }).nth(1).click();
      await page.locator('#form-variants-1-options-0-label').fill('Ancho (cm)');
      await chooseSelect(page, page.locator('#form-variants-1-options-0-type'), 'Número');
      await page.locator('#form-variants-1-options-0-minValue').fill('10');
      await page.locator('#form-variants-1-options-0-maxValue').fill('200');
      await page.locator('#form-variants-1-options-0-isRequired').click();
      await page.locator('#form-variants-1-options-0-helpText').fill('Medida en centímetros');

      await page.getByRole('button', { name: 'Agregar opción' }).nth(1).click();
      await page.locator('#form-variants-1-options-1-label').fill('Acabado');
      await chooseSelect(
        page,
        page.locator('#form-variants-1-options-1-type'),
        'Lista de opciones',
      );
      await page.getByRole('button', { name: 'Agregar valor' }).click();
      await page.getByRole('button', { name: 'Agregar valor' }).click();
      await page.locator('#form-variants-1-options-1-choice-0').fill('Mate');
      await page.locator('#form-variants-1-options-1-choice-1').fill('Brillante');

      await page.locator('#form-variants-1-priceFormula').fill('base_price * option.ancho_cm');
      await page.getByRole('button', { name: /^Insertar Cantidad solicitada/ }).click();

      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await page.locator('#form-variants-0-title').inputValue()).toBe('Estándar');
      expect(await page.locator('#form-variants-0-leadTimeDays').inputValue()).toBe('5');
      expect(await page.locator('#form-variants-1-title').inputValue()).toBe('A medida');
      expect(await page.locator('#form-variants-1-code').inputValue()).toBe('VAR-MED');
      expect(await page.locator('#form-variants-1-minOrderQty').inputValue()).toBe('3');
      expect(await page.locator('#form-variants-1-incrementQty').inputValue()).toBe('2');
      expect(await page.locator('#form-variants-1-unitId').inputValue()).toBe('Pieza');
      expect(await page.locator('#form-variants-1-isActive').getAttribute('aria-checked')).toBe(
        'false',
      );
      await page
        .locator('#form-variants-1-pricingModel')
        .filter({ hasText: 'Fórmula personalizada' })
        .waitFor();
      expect(await page.locator('#form-variants-1-priceFormula').inputValue()).toContain(
        'base_price * option.ancho_cm',
      );
      expect(await page.locator('#form-variants-1-priceFormula').inputValue()).toContain(
        'quantity',
      );

      expect(await page.locator('#form-variants-1-options-0-label').inputValue()).toBe(
        'Ancho (cm)',
      );
      expect(await page.locator('#form-variants-1-options-0-key').inputValue()).toBe('ancho_cm');
      await page.locator('#form-variants-1-options-0-type').filter({ hasText: 'Número' }).waitFor();
      expect(await page.locator('#form-variants-1-options-0-minValue').inputValue()).toBe('10');
      expect(await page.locator('#form-variants-1-options-0-maxValue').inputValue()).toBe('200');
      expect(
        await page.locator('#form-variants-1-options-0-isRequired').getAttribute('aria-checked'),
      ).toBe('true');
      expect(await page.locator('#form-variants-1-options-0-helpText').inputValue()).toBe(
        'Medida en centímetros',
      );
      expect(await page.locator('#form-variants-1-options-1-choice-0').inputValue()).toBe('Mate');
      expect(await page.locator('#form-variants-1-options-1-choice-1').inputValue()).toBe(
        'Brillante',
      );
    });

    it('uploads a document and a gallery image and serves them publicly', async () => {
      const title = uniqueTitle('Archivos');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('ARC-1');

      await page.getByRole('button', { name: 'Agregar documento' }).click();
      const document = item(page, 'Documento 1');
      await document.getByPlaceholder('Ej: Certificado de calidad').fill('Ficha técnica');
      await document.locator('input[type=file]').setInputFiles(PDF);
      await document.locator('[data-slot=attachment][data-state="done"]').waitFor();

      await page.locator(GALLERY_INPUT).setInputFiles(PNG);
      await item(page, 'Imagen principal').waitFor();
      await page.locator('#form-images-0-altText').fill('Vista frontal');

      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await page.locator('#form-images-0-altText').inputValue()).toBe('Vista frontal');

      const image = item(page, 'Imagen principal').locator('img');
      const imageSrc = await image.getAttribute('src');
      expect(imageSrc).toContain('/products/images/');
      expect((await fetch(imageSrc ?? '')).status).toBe(200);

      const link = item(page, 'Documento 1').locator('a[target="_blank"]');
      await link.waitFor({ state: 'attached' });
      const href = await link.getAttribute('href');
      expect(href).toContain('/products/documents/');
      const response = await fetch(href ?? '');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('pdf');
      expect(
        await item(page, 'Documento 1').getByPlaceholder('Ej: Certificado de calidad').inputValue(),
      ).toBe('Ficha técnica');
    });

    it('links gallery images to a variant, reorders them and hides one', async () => {
      const title = uniqueTitle('Galería');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('GAL-1');
      await page.getByRole('button', { name: 'Agregar variante' }).click();
      await page.locator('#form-variants-1-title').fill('Rojo');
      await page.locator('#form-variants-1-code').fill('GAL-2');

      const gallery = page.locator(GALLERY_INPUT);
      await gallery.setInputFiles([PNG, { ...PNG, name: 'segunda.png' }]);
      await item(page, 'Imagen 2').waitFor();

      expect(await page.getByText('2 imágenes').isVisible()).toBe(true);

      await chooseSelect(page, page.locator('#form-images-1-variantId'), 'Rojo');
      await page.locator('#form-images-1-altText').fill('Segunda imagen');
      await page.locator('#form-images-0-isVisible').click();

      // The second image becomes the main one.
      await page.getByRole('button', { name: 'Mover imagen 2 antes' }).click();
      expect(await page.locator('#form-images-0-altText').inputValue()).toBe('Segunda imagen');

      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await page.locator('#form-images-0-altText').inputValue()).toBe('Segunda imagen');
      await page.locator('#form-images-0-variantId').filter({ hasText: 'Rojo' }).waitFor();
      await page.locator('#form-images-1-variantId').filter({ hasText: 'General' }).waitFor();
      expect(await page.locator('#form-images-1-isVisible').getAttribute('aria-checked')).toBe(
        'false',
      );
    });

    it('falls back to a general image when its variant is removed', async () => {
      await openNewProduct(page);
      await page.getByRole('button', { name: 'Agregar variante' }).click();
      await page.locator('#form-variants-1-title').fill('Temporal');

      await page.locator(GALLERY_INPUT).setInputFiles(PNG);
      await item(page, 'Imagen principal').waitFor();
      await chooseSelect(page, page.locator('#form-images-0-variantId'), 'Temporal');

      await variantCard(page, 1).getByRole('button', { name: 'Eliminar', exact: true }).click();
      await page.locator('#form-images-0-variantId').filter({ hasText: 'General' }).waitFor();
    });

    it('discards a gallery image before saving', async () => {
      await openNewProduct(page);
      await page.locator(GALLERY_INPUT).setInputFiles(PNG);
      await item(page, 'Imagen principal').waitFor();

      await item(page, 'Imagen principal')
        .getByRole('button', { name: 'Eliminar', exact: true })
        .click();
      expect(await page.getByText('Sin imágenes registradas.').isVisible()).toBe(true);
    });

    it('skips unsupported gallery files with a notice', async () => {
      await openNewProduct(page);
      await page.locator(GALLERY_INPUT).setInputFiles({
        name: 'nota.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('hola'),
      });

      await page.getByRole('alert').filter({ hasText: 'Se omitió 1 archivo' }).waitFor();
      expect(await page.getByText('Sin imágenes registradas.').isVisible()).toBe(true);
    });

    it('creates related and complementary links to other products', async () => {
      const target = uniqueTitle('Destino');
      await createProduct(page, target, { code: 'DEST-1' });

      const title = uniqueTitle('Con enlaces');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('LNK-1');

      await page.getByRole('button', { name: 'Agregar relacionado' }).click();
      await chooseCombobox(
        page,
        item(page, 'Relacionado 1').getByPlaceholder('Buscar producto...'),
        target,
      );

      await page.getByRole('button', { name: 'Agregar complementario' }).click();
      const complement = item(page, 'Complemento 1');
      expect(await complement.getByText('Selecciona un producto').isVisible()).toBe(true);
      await chooseCombobox(
        page,
        page.locator('#form-complementaryProducts-0-linkedProductId'),
        target,
      );
      await chooseSelect(
        page,
        page.locator('#form-complementaryProducts-0-linkedVariantId'),
        `Estándar (DEST-1)`,
      );
      await chooseSelect(page, page.locator('#form-complementaryProducts-0-variantId'), 'Estándar');
      await complement.getByText(/solo la variante "Estándar \(DEST-1\)"/).waitFor();

      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(
        await item(page, 'Relacionado 1').getByPlaceholder('Buscar producto...').inputValue(),
      ).toBe(target);
      expect(await page.locator('#form-complementaryProducts-0-linkedProductId').inputValue()).toBe(
        target,
      );
      await page
        .locator('#form-complementaryProducts-0-linkedVariantId')
        .filter({ hasText: 'Estándar (DEST-1)' })
        .waitFor();
      await page
        .locator('#form-complementaryProducts-0-variantId')
        .filter({ hasText: 'Estándar' })
        .waitFor();
    });

    it('rejects the same related product twice', async () => {
      const target = uniqueTitle('Doble');
      await createProduct(page, target, { code: 'DBL-1' });

      await openNewProduct(page);
      await page.locator('#form-product-title').fill(uniqueTitle('Dobles'));
      await page.locator('#form-variants-0-code').fill('DBL-2');
      for (const n of [1, 2]) {
        await page.getByRole('button', { name: 'Agregar relacionado' }).click();
        await chooseCombobox(
          page,
          item(page, `Relacionado ${n}`).getByPlaceholder('Buscar producto...'),
          target,
        );
      }
      await submitForm(page);

      await page.getByText('Este producto ya fue agregado').waitFor();
      expect(page.url()).toBe(`${LIST_URL}/new`);
    });

    it('does not offer a variant picker for a complement until a product is chosen', async () => {
      await openNewProduct(page);
      await page.getByRole('button', { name: 'Agregar complementario' }).click();
      expect(await page.locator('#form-complementaryProducts-0-linkedVariantId').isDisabled()).toBe(
        true,
      );
      expect(await page.getByText('Primero selecciona el producto.').isVisible()).toBe(true);
    });

    it('shows the server error when a referenced record disappears', async () => {
      const title = uniqueTitle('Referencia perdida');
      await sql`INSERT INTO tag (id, slug, name) VALUES ('tag_e2e_temp', 'e2e-tag-temp', 'E2E Tag Temporal') ON CONFLICT DO NOTHING`;
      await sql`UPDATE tag SET deleted_at = NULL WHERE id = 'tag_e2e_temp'`;

      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('REF-1');
      await page.getByPlaceholder('Buscar tags...').click();
      await page.getByRole('option', { name: 'E2E Tag Temporal' }).click();
      await page.keyboard.press('Escape');

      await sql`UPDATE tag SET deleted_at = now() WHERE id = 'tag_e2e_temp'`;

      await submitForm(page);
      expect(await toastText(page)).toContain('Algún tag seleccionado no existe');
      expect(page.url()).toBe(`${LIST_URL}/new`);

      await searchInList(page, title);
      await page.locator('[data-slot=list-empty]').waitFor();
    });

    it('keeps the form data when the server rejects the submission', async () => {
      const title = uniqueTitle('Conserva datos');
      await sql`INSERT INTO tag (id, slug, name) VALUES ('tag_e2e_temp2', 'e2e-tag-temp2', 'E2E Tag Temporal 2') ON CONFLICT DO NOTHING`;
      await sql`UPDATE tag SET deleted_at = NULL WHERE id = 'tag_e2e_temp2'`;

      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('REF-2');
      await page.getByPlaceholder('Buscar tags...').click();
      await page.getByRole('option', { name: 'E2E Tag Temporal 2' }).click();
      await page.keyboard.press('Escape');
      await sql`UPDATE tag SET deleted_at = now() WHERE id = 'tag_e2e_temp2'`;

      await submitForm(page);
      await toastText(page);

      expect(await page.locator('#form-product-title').inputValue()).toBe(title);
      expect(await page.locator('#form-variants-0-code').inputValue()).toBe('REF-2');
      expect(await page.locator('#product-form button[type="submit"]').isEnabled()).toBe(true);
    });
  });

  describe('editing products', () => {
    beforeEach(async () => {
      await loginAsAdmin(page);
    });

    it('opens the edit form from the row actions with the stored values', async () => {
      const title = uniqueTitle('Editar abrir');
      await createProduct(page, title, { code: 'EDT-1' });
      await openEdit(page, title);

      expect(await page.getByRole('heading', { name: 'Editar producto' }).isVisible()).toBe(true);
      expect(await page.locator('#form-product-title').inputValue()).toBe(title);
      expect(await page.locator('#form-variants-0-code').inputValue()).toBe('EDT-1');
      expect(await page.getByRole('button', { name: 'Guardar cambios' }).isVisible()).toBe(true);
    });

    it('saves edits and returns to the list', async () => {
      const title = uniqueTitle('Editar guardar');
      const renamed = `${title} renombrado`;
      await createProduct(page, title, { code: 'EDT-2' });
      await openEdit(page, title);

      await page.locator('#form-product-title').fill(renamed);
      await chooseSelect(page, page.locator('#form-product-status'), 'Inactivo');
      await submitForm(page);
      await waitForList(page);

      await searchInList(page, renamed);
      expect(await page.getByRole('cell', { name: renamed, exact: true }).isVisible()).toBe(true);
      expect(await page.getByText('Inactivo', { exact: true }).isVisible()).toBe(true);

      await searchInList(page, title);
      expect(await page.getByRole('cell', { name: title, exact: true }).count()).toBe(0);
    });

    it('submits an untouched edit form without changes', async () => {
      const title = uniqueTitle('Editar igual');
      await createProduct(page, title, { code: 'EDT-3' });
      await openEdit(page, title);
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await page.locator('#form-product-title').inputValue()).toBe(title);
      expect(await page.locator('#form-variants-0-code').inputValue()).toBe('EDT-3');
    });

    it('validates the edit form like the creation form', async () => {
      const title = uniqueTitle('Editar valida');
      await createProduct(page, title, { code: 'EDT-4' });
      await openEdit(page, title);

      await page.locator('#form-product-title').fill('');
      await submitForm(page);
      await page.getByText(REQUIRED).first().waitFor();
      expect(page.url()).toContain('/dashboard/products/form/');
    });

    it('keeps the edit form on the page when cancelling', async () => {
      const title = uniqueTitle('Editar cancela');
      await createProduct(page, title, { code: 'EDT-5' });
      await openEdit(page, title);

      await page.locator('#form-product-title').fill('No se guarda');
      await page.getByRole('link', { name: 'Cancelar' }).click();
      await page.waitForURL(LIST_URL);

      await searchInList(page, title);
      expect(await page.getByRole('cell', { name: title, exact: true }).isVisible()).toBe(true);
    });

    it('adds a variant, edits another and removes a third while keeping the rest', async () => {
      const title = uniqueTitle('Editar variantes');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('EV-1');
      for (const n of [1, 2]) {
        await page.getByRole('button', { name: 'Agregar variante' }).click();
        await page.locator(`#form-variants-${n}-title`).fill(`Extra ${n}`);
        await page.locator(`#form-variants-${n}-code`).fill(`EV-${n + 1}`);
      }
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      await page.locator('#form-variants-1-title').fill('Extra 1 editada');
      await variantCard(page, 2).getByRole('button', { name: 'Eliminar', exact: true }).click();
      await page.getByRole('button', { name: 'Agregar variante' }).click();
      await page.locator('#form-variants-2-title').fill('Nueva');
      await page.locator('#form-variants-2-code').fill('EV-NEW');
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await page.locator('#form-variants-0-title').inputValue()).toBe('Estándar');
      expect(await page.locator('#form-variants-1-title').inputValue()).toBe('Extra 1 editada');
      expect(await page.locator('#form-variants-1-code').inputValue()).toBe('EV-2');
      expect(await page.locator('#form-variants-2-title').inputValue()).toBe('Nueva');
      expect(await page.locator('#form-variants-3-title').count()).toBe(0);
    });

    it('rejects a repeated variant code while editing', async () => {
      const title = uniqueTitle('Editar códigos');
      await createProduct(page, title, { code: 'EC-1' });
      await openEdit(page, title);

      await page.getByRole('button', { name: 'Agregar variante' }).click();
      await page.locator('#form-variants-1-title').fill('Otra');
      await page.locator('#form-variants-1-code').fill('ec-1');
      await submitForm(page);

      await page.getByText('El código ya está en uso en otra variante').waitFor();
      expect(page.url()).toContain('/dashboard/products/form/');
    });

    it('keeps stored images and files across edits and lets them be replaced', async () => {
      const title = uniqueTitle('Editar galería');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('EG-1');
      await page.locator(GALLERY_INPUT).setInputFiles(PNG);
      await item(page, 'Imagen principal').waitFor();
      await page.locator('#form-images-0-altText').fill('Original');
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      const originalSrc = await item(page, 'Imagen principal').locator('img').getAttribute('src');
      await page.locator('#form-images-0-altText').fill('Editada');
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await page.locator('#form-images-0-altText').inputValue()).toBe('Editada');
      expect(await item(page, 'Imagen principal').locator('img').getAttribute('src')).toBe(
        originalSrc,
      );

      await page.locator(GALLERY_INPUT).setInputFiles({ ...PNG, name: 'nueva.png' });
      await item(page, 'Imagen 2').waitFor();
      await item(page, 'Imagen principal')
        .getByRole('button', { name: 'Eliminar', exact: true })
        .click();
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await page.locator('#form-images-1-altText').count()).toBe(0);
      const replacedSrc = await item(page, 'Imagen principal').locator('img').getAttribute('src');
      expect(replacedSrc).not.toBe(originalSrc);
      expect((await fetch(replacedSrc ?? '')).status).toBe(200);
    });

    it('keeps the stored document file and allows removing the document', async () => {
      const title = uniqueTitle('Editar documentos');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('ED-1');
      await page.getByRole('button', { name: 'Agregar documento' }).click();
      const document = item(page, 'Documento 1');
      await document.getByPlaceholder('Ej: Certificado de calidad').fill('Manual');
      await document.locator('input[type=file]').setInputFiles(PDF);
      await document.locator('[data-slot=attachment][data-state="done"]').waitFor();
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      const link = item(page, 'Documento 1').locator('a[target="_blank"]');
      await link.waitFor({ state: 'attached' });
      const href = await link.getAttribute('href');

      await item(page, 'Documento 1')
        .getByPlaceholder('Ej: Certificado de calidad')
        .fill('Manual v2');
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      const sameLink = item(page, 'Documento 1').locator('a[target="_blank"]');
      await sameLink.waitFor({ state: 'attached' });
      expect(await sameLink.getAttribute('href')).toBe(href);

      await item(page, 'Documento 1')
        .getByRole('button', { name: 'Eliminar', exact: true })
        .click();
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await page.getByText('Sin documentos registrados.').isVisible()).toBe(true);
    });

    it('updates tags, categories, prices, details and links', async () => {
      const target = uniqueTitle('Enlace edición');
      await createProduct(page, target, { code: 'ER-T' });

      const title = uniqueTitle('Editar relaciones');
      await openNewProduct(page);
      await page.locator('#form-product-title').fill(title);
      await page.locator('#form-variants-0-code').fill('ER-1');
      await page.getByPlaceholder('Buscar tags...').click();
      await page.getByRole('option', { name: SEEDED_TAGS[0] ?? '' }).click();
      await page.keyboard.press('Escape');
      await page.locator('#prices-0-amount').fill('50');
      await page.getByRole('button', { name: 'Agregar detalle' }).click();
      await item(page, 'Detalle 1').getByPlaceholder('Ej: Material').fill('Color');
      await item(page, 'Detalle 1').getByPlaceholder('Ej: Acero inoxidable').fill('Azul');
      await page.getByRole('button', { name: 'Agregar relacionado' }).click();
      await chooseCombobox(
        page,
        item(page, 'Relacionado 1').getByPlaceholder('Buscar producto...'),
        target,
      );
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      // Replace the tag, clear the price, change the detail and drop the related link.
      await page.getByPlaceholder('Buscar tags...').click();
      await page.getByRole('option', { name: SEEDED_TAGS[0] ?? '' }).click();
      await page.getByRole('option', { name: SEEDED_TAGS[1] ?? '' }).click();
      await page.keyboard.press('Escape');
      await page.locator('#prices-0-amount').fill('');
      await page.locator('#prices-1-amount').fill('75');
      await item(page, 'Detalle 1').getByPlaceholder('Ej: Acero inoxidable').fill('Rojo');
      await item(page, 'Relacionado 1')
        .getByRole('button', { name: 'Eliminar', exact: true })
        .click();
      await submitForm(page);
      await waitForList(page);

      await openEdit(page, title);
      expect(await page.getByText(SEEDED_TAGS[0] ?? '', { exact: true }).count()).toBe(0);
      expect(
        await page
          .getByText(SEEDED_TAGS[1] ?? '', { exact: true })
          .first()
          .isVisible(),
      ).toBe(true);
      expect(await page.locator('#prices-0-amount').inputValue()).toBe('');
      expect(await page.locator('#prices-1-amount').inputValue()).toBe('75');
      expect(
        await item(page, 'Detalle 1').getByPlaceholder('Ej: Acero inoxidable').inputValue(),
      ).toBe('Rojo');
      expect(await page.getByText('Sin productos relacionados.').isVisible()).toBe(true);
    });

    it('does not offer the edited product as its own relation', async () => {
      const title = uniqueTitle('Sin autoenlace');
      await createProduct(page, title, { code: 'SA-1' });
      await openEdit(page, title);

      await page.getByRole('button', { name: 'Agregar relacionado' }).click();
      const input = item(page, 'Relacionado 1').getByPlaceholder('Buscar producto...');
      await input.click();
      await input.fill(title);
      await page
        .getByText('No se encontraron', { exact: false })
        .first()
        .waitFor()
        .catch(() => undefined);
      expect(await page.getByRole('option', { name: title, exact: true }).count()).toBe(0);
    });

    it('surfaces a server error when editing a product that was archived meanwhile', async () => {
      const title = uniqueTitle('Archivado');
      await createProduct(page, title, { code: 'AR-1' });
      await openEdit(page, title);

      const id = page.url().split('/form/')[1] ?? '';
      await sql`UPDATE product SET deleted_at = now() WHERE id = ${id}`;

      await page.locator('#form-product-title').fill(`${title} cambio`);
      await submitForm(page);
      expect(await toastText(page)).toContain('El recurso solicitado no existe');
      expect(page.url()).toContain('/dashboard/products/form/');
    });

    it('renders the 404 page for an archived product', async () => {
      const title = uniqueTitle('Archivado 404');
      await createProduct(page, title, { code: 'AR-2' });
      await openEdit(page, title);
      const id = page.url().split('/form/')[1] ?? '';
      await sql`UPDATE product SET deleted_at = now() WHERE id = ${id}`;

      await page.goto(`${LIST_URL}/form/${id}`);
      await page.getByRole('heading', { name: 'Página no encontrada' }).waitFor();
    });
  });
});
