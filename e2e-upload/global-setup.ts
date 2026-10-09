import { execSync } from 'node:child_process';
import { uploadE2e } from './test-utils/container';

export async function setup() {
  await uploadE2e.start();

  execSync('pnpm db:seed', {
    env: {
      ...process.env,
      ADMIN_SEED_EMAIL: 'admin@e2e.test',
      ADMIN_SEED_PASSWORD: 'Pass1234',
    },
    stdio: 'inherit',
  });
}
