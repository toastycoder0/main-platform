import { type Browser, chromium, type Page } from 'playwright';

const BASE = 'http://localhost:3001';

export async function createBrowser(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  return { browser, page };
}

export async function createUser(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: 'Test',
      lastName: 'User',
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Failed to create user: ${res.status} ${JSON.stringify(body)}`);
  }

  return res.json();
}

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('#form-email', email);
  await page.fill('#form-password', password);
  await page.click('button[type="submit"]');
}
