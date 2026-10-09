import { uploadE2e } from './test-utils/container';

export async function teardown() {
  await uploadE2e.stop();
}
