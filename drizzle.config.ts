import { defineConfig } from 'drizzle-kit';
import { env } from '@/config/env';

export default defineConfig({
  out: './drizzle',
  schema: './src/infrastructure/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
