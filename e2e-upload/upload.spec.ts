import type { Page } from 'playwright';
import { describe, expect, it } from 'vitest';
import { BASE, createBrowser, createPage, loginAs } from './test-utils/browser';

const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASS = 'Pass1234';

async function saveTaxProfiles(page: Page): Promise<void> {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/account/billing') && response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Guardar cambios' }).click(),
  ]);
}

describe('file upload against real storage', () => {
  it('uploads a tax document, persists it and serves it publicly', async () => {
    const browser = await createBrowser();
    const page = await createPage(browser);

    try {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
      await page.waitForURL(`${BASE}/`);

      await page.goto(`${BASE}/account/billing`);
      await page.getByRole('heading', { name: 'Perfiles de facturación' }).waitFor();

      await page.getByRole('button', { name: 'Agregar perfil' }).click();

      const item = page.locator('[data-slot=collection-item]').last();
      await item.getByLabel('Alias', { exact: true }).fill('Empresa E2E');
      await item.getByLabel('Razón social', { exact: true }).fill('Empresa E2E S.A. de C.V.');
      await item.getByLabel('RFC', { exact: true }).fill('ABC123456789');
      await item.getByLabel('Código postal fiscal', { exact: true }).fill('06000');

      const cfdi = item.getByLabel('Uso de CFDI', { exact: true });
      await cfdi.click();
      await cfdi.fill('mobiliario');
      await page
        .getByRole('option', { name: 'I02 - Mobiliario y equipo de oficina para inversiones' })
        .click();

      const regime = item.getByLabel('Régimen fiscal', { exact: true });
      await regime.click();
      await regime.fill('PEMEX');
      await page.getByRole('option', { name: '617 - PEMEX' }).click();

      await item.locator('input[type=file]').setInputFiles({
        name: 'RFC.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n%%EOF'),
      });

      // The attachment only reaches `done` after the PUT and confirm succeed.
      await item.locator('[data-slot=attachment][data-state="done"]').waitFor();

      await saveTaxProfiles(page);
      await page.getByText('Perfiles de facturación guardados').waitFor();

      await page.reload();
      await page.getByRole('heading', { name: 'Perfiles de facturación' }).waitFor();

      const link = page.locator('[data-slot=collection-item] a[target="_blank"]').first();
      await link.waitFor({ state: 'attached' });

      const href = await link.getAttribute('href');
      expect(href).toContain('/uploads/users/taxes/');

      const response = await fetch(href ?? '');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('pdf');
    } finally {
      await browser.close();
    }
  });
});
