'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { run } from '@/infrastructure/services/next-action';
import { auth } from './auth';

export const logout = run({}, async (_ctx) => {
  await auth.api.signOut({ headers: await headers() });
  redirect('/auth/login');
});
