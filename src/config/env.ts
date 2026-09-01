import { createEnv } from '@t3-oss/env-nextjs';
import * as z from 'zod';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_CLOUD_URL?: string;
      NEXT_PUBLIC_PHONE?: string;
      NEXT_PUBLIC_EMAIL?: string;
      NEXT_PUBLIC_CALCULATOR_SOURCE?: string;
      DATABASE_URL?: string;
      CLOUD_ACCOUNT_ID?: string;
      CLOUD_ENDPOINT?: string;
      CLOUD_SECRET_ACCESS_KEY?: string;
      CLOUD_ACCESS_KEY_ID?: string;
      CLOUD_BUCKET?: string;
      EXCHANGE_TOKEN?: string;
      CRON_SECRET?: string;
      BILLING_API_URL?: string;
      BILLING_USERNAME?: string;
      BILLING_PASSWORD?: string;
      BETTER_AUTH_SECRET?: string;
      ADMIN_SEED_EMAIL: string;
      ADMIN_SEED_PASSWORD: string;
      VERCEL_URL?: string;
    }
  }
}

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CLOUD_ACCOUNT_ID: z.string().min(1),
    CLOUD_ENDPOINT: z.string().optional(),
    CLOUD_SECRET_ACCESS_KEY: z.string().min(1),
    CLOUD_ACCESS_KEY_ID: z.string().min(1),
    CLOUD_BUCKET: z.string().min(1),
    EXCHANGE_TOKEN: z.string().min(1),
    CRON_SECRET: z.string().min(1),
    BILLING_API_URL: z.string().min(1),
    BILLING_USERNAME: z.string().min(1),
    BILLING_PASSWORD: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    ADMIN_SEED_EMAIL: z.email(),
    ADMIN_SEED_PASSWORD: z.string().min(8),
  },
  client: {
    NEXT_PUBLIC_CLOUD_URL: z.url(),
    NEXT_PUBLIC_PHONE: z.string().min(1),
    NEXT_PUBLIC_EMAIL: z.email(),
    NEXT_PUBLIC_CALCULATOR_SOURCE: z.string().min(1),
  },
  runtimeEnv: {
    NEXT_PUBLIC_CLOUD_URL: process.env.NEXT_PUBLIC_CLOUD_URL,
    NEXT_PUBLIC_PHONE: process.env.NEXT_PUBLIC_PHONE,
    NEXT_PUBLIC_EMAIL: process.env.NEXT_PUBLIC_EMAIL,
    NEXT_PUBLIC_CALCULATOR_SOURCE: process.env.NEXT_PUBLIC_CALCULATOR_SOURCE,
    DATABASE_URL: process.env.DATABASE_URL,
    CLOUD_ACCOUNT_ID: process.env.CLOUD_ACCOUNT_ID,
    CLOUD_ENDPOINT: process.env.CLOUD_ENDPOINT,
    CLOUD_SECRET_ACCESS_KEY: process.env.CLOUD_SECRET_ACCESS_KEY,
    CLOUD_ACCESS_KEY_ID: process.env.CLOUD_ACCESS_KEY_ID,
    CLOUD_BUCKET: process.env.CLOUD_BUCKET,
    EXCHANGE_TOKEN: process.env.EXCHANGE_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    BILLING_API_URL: process.env.BILLING_API_URL,
    BILLING_USERNAME: process.env.BILLING_USERNAME,
    BILLING_PASSWORD: process.env.BILLING_PASSWORD,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
    ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
  },
});
