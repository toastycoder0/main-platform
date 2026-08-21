import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';

export const db = drizzle({
  client: postgres(env.DATABASE_URL),
});

export type DatabaseClient = typeof db;
