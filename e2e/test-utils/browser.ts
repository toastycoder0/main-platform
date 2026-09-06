import { type Browser, chromium, type Page } from 'playwright';

const BASE = 'http://localhost:3001';

export async function createBrowser(headless = true): Promise<Browser> {
  return await chromium.launch({ headless });
}

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('#form-email', email);
  await page.fill('#form-password', password);
  await page.click('button[type="submit"]');
}

export async function createPage(browser: Browser): Promise<Page> {
  return await browser.newPage();
}
