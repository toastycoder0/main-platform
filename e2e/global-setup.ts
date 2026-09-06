import { execSync } from 'node:child_process';
import { e2e } from './test-utils/container';

export async function setup() {
  await e2e.start();

  execSync('pnpm db:seed', {
    env: {
      ...process.env,
      ADMIN_SEED_EMAIL: 'admin@e2e.test',
      ADMIN_SEED_PASSWORD: 'Pass1234',
    },
    stdio: 'inherit',
  });
}
