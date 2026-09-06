import { e2e } from './test-utils/container';

export async function teardown() {
  await e2e.stop();
}
