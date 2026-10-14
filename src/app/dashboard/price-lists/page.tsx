import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { PriceListsTable } from '@/modules/price-lists/components/price-lists-table';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadListParams } from '@/shared/list/list-params';

interface PriceListsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PriceListsPage({ searchParams }: PriceListsPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.priceLists.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Listas de precios</h1>

      <ListToolbar
        searchLabel='Buscar listas de precios'
        searchPlaceholder='Buscar por nombre o slug…'
      >
        {ctx.permissions.has(PERMISSIONS.admin.priceLists.create) ? (
          <ListCreateButton href='/dashboard/price-lists/new'>
            Crear lista de precios
          </ListCreateButton>
        ) : null}
      </ListToolbar>

      <Suspense fallback={<ListSkeleton />}>
        <PriceListsTable params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
