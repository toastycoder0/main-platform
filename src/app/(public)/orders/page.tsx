import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { OrdersList } from '@/modules/orders/components/orders-list';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { loadListParams } from '@/shared/list/list-params';

export const metadata: Metadata = { title: 'Pedidos' };

interface OrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  return (
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6'>
      <h1 className='text-2xl font-semibold'>Mis pedidos</h1>

      <Suspense fallback={<ListSkeleton rows={5} toolbar />}>
        <OrdersList params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
