import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  return <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8'>{children}</div>;
}
