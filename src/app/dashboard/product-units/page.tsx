import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ProductUnitsTable } from '@/modules/product-units/components/product-units-table';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadListParams } from '@/shared/list/list-params';

interface ProductUnitsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductUnitsPage({ searchParams }: ProductUnitsPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.productUnits.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Gestión de unidades de medida</h1>

      <ListToolbar searchLabel='Buscar unidades' searchPlaceholder='Buscar por nombre o slug…'>
        {ctx.permissions.has(PERMISSIONS.admin.productUnits.create) ? (
          <ListCreateButton href='/dashboard/product-units/new'>Crear unidad</ListCreateButton>
        ) : null}
      </ListToolbar>

      <Suspense fallback={<ListSkeleton />}>
        <ProductUnitsTable params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
