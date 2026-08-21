import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  user: {
    modelName: 'user',
    fields: { name: 'firstName' },
    additionalFields: {
      lastName: { type: 'string', required: true },
    },
  },
  emailAndPassword: { enabled: true },
});
