import { execSync } from 'node:child_process';
import postgres from 'postgres';
import { e2e } from './test-utils/container';

export async function setup() {
  await e2e.start();

  const url = process.env.DATABASE_URL;

  if (url) {
    const client = postgres(url);
    await client`
      TRUNCATE TABLE
        category,
        file,
        session,
        account,
        verification,
        user_role,
        role_permission,
        "user",
        "role",
        permission
      RESTART IDENTITY CASCADE
    `;
    await client.end();
  }

  execSync('pnpm db:seed', {
    env: {
      ...process.env,
      ADMIN_SEED_EMAIL: 'admin@e2e.test',
      ADMIN_SEED_PASSWORD: 'Pass1234',
    },
    stdio: 'inherit',
  });
}
