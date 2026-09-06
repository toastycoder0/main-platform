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
    include: ['./e2e/**/*.e2e.test.ts'],
    environment: 'node',
    setupFiles: [],
    globalSetup: ['./e2e/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
