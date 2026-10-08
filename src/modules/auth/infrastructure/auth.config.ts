import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { env } from '@/config/env';
import { db } from '@/infrastructure/db';
import { account, session, user, verification } from '@/infrastructure/db/schema';
import { logger } from '@/infrastructure/logger';

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
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword({ user, token }) {
      // No mail provider configured yet: the link is logged instead. With one
      // (Resend/SMTP), send the email here and return its promise (better-auth
      // expects Promise<void>).
      const appUrl = env.APP_URL ?? 'http://localhost:3000';
      const url = `${appUrl}/auth/reset-password?token=${token}`;

      logger.info(
        { userId: user.id, email: user.email, url },
        'Password reset link generated (no email provider configured)',
      );

      return Promise.resolve();
    },
  },
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
