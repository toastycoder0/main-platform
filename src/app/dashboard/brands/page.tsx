import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { BrandsTable } from '@/modules/brands/components/brands-table';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadListParams } from '@/shared/list/list-params';

interface BrandsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.brands.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Gestión de marcas</h1>

      <ListToolbar searchLabel='Buscar marcas' searchPlaceholder='Buscar por nombre o slug…'>
        {ctx.permissions.has(PERMISSIONS.admin.brands.create) ? (
          <ListCreateButton href='/dashboard/brands/new'>Crear marca</ListCreateButton>
        ) : null}
      </ListToolbar>

      <Suspense fallback={<ListSkeleton />}>
        <BrandsTable params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
