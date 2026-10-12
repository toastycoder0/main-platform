import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { CurrenciesTable } from '@/modules/currencies/components/currencies-table';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadListParams } from '@/shared/list/list-params';

interface CurrenciesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CurrenciesPage({ searchParams }: CurrenciesPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.currencies.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Gestión de monedas</h1>

      <ListToolbar searchLabel='Buscar monedas' searchPlaceholder='Buscar por código o nombre…'>
        {ctx.permissions.has(PERMISSIONS.admin.currencies.create) ? (
          <ListCreateButton href='/dashboard/currencies/new'>Crear moneda</ListCreateButton>
        ) : null}
      </ListToolbar>

      <Suspense fallback={<ListSkeleton />}>
        <CurrenciesTable params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
