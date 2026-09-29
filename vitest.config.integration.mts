import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.integration.test.ts'],
    environment: 'node',
    globalSetup: ['./src/shared/db/test/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
