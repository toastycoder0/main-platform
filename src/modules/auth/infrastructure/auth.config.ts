import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { db } from '@/shared/db';
import { account, session, user, verification } from '@/shared/db/schema';
import { logger } from '@/shared/logger';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  user: {
    modelName: 'user',
    fields: { name: 'firstName' },
    additionalFields: {
      lastName: { type: 'string', required: true },
    },
  },
  emailAndPassword: { enabled: true },
  plugins: [admin(), nextCookies()],
  onAPIError: {
    onError(error, ctx) {
      logger.info({
        userId: ctx.session?.user?.id,
        appName: ctx.appName,
        baseURL: ctx.baseURL,
        version: ctx.version,
        error,
      });
    },
  },
});
