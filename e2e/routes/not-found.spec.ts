import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBrowser, createPage } from '../test-utils/browser';

const BASE = 'http://localhost:3001';

describe('Not found E2E', () => {
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

  it('renders the 404 page for an unknown URL', async () => {
    await page.goto(`${BASE}/ruta-que-no-existe`);

    expect(page.url()).toBe(`${BASE}/ruta-que-no-existe`);

    const heading = page.getByRole('heading', { name: 'Página no encontrada' });
    await heading.waitFor();
    expect(await heading.isVisible()).toBe(true);
  });
});
