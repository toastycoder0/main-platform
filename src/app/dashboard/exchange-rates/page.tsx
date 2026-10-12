import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ExchangeRatesTable } from '@/modules/exchange-rates/components/exchange-rates-table';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadListParams } from '@/shared/list/list-params';

interface ExchangeRatesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ExchangeRatesPage({ searchParams }: ExchangeRatesPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.exchangeRates.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Tipos de cambio</h1>

      <ListToolbar searchLabel='Buscar tipos de cambio' searchPlaceholder='Buscar por par…'>
        {ctx.permissions.has(PERMISSIONS.admin.exchangeRates.create) ? (
          <ListCreateButton href='/dashboard/exchange-rates/new'>
            Crear tipo de cambio
          </ListCreateButton>
        ) : null}
      </ListToolbar>

      <Suspense fallback={<ListSkeleton />}>
        <ExchangeRatesTable params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
