import postgres from 'postgres';
import { e2e } from './test-utils/container';

export async function teardown() {
  const url = process.env.DATABASE_URL;

  if (url) {
    const client = postgres(url);
    await client`DELETE FROM role WHERE name LIKE 'E2E %'`;
    await client.end();
  }

  await e2e.stop();
}
