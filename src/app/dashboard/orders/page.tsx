import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ManagementOrdersList } from '@/modules/orders/components/management-orders-list';
import {
  loadManagementOrdersParams,
  serializeManagementOrdersParams,
} from '@/modules/orders/infrastructure/orders.params';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { PERMISSIONS } from '@/shared/constants/permissions';

export const metadata: Metadata = { title: 'Pedidos' };

interface ManagementOrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManagementOrdersPage({ searchParams }: ManagementOrdersPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login?next=/dashboard/orders');
  }

  if (!ctx.permissions.has(PERMISSIONS.orders.manage)) {
    notFound();
  }

  const params = await loadManagementOrdersParams(searchParams);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Pedidos</h1>

      <Suspense key={serializeManagementOrdersParams(params)} fallback={<ListSkeleton />}>
        <ManagementOrdersList params={params} />
      </Suspense>
    </div>
  );
}
