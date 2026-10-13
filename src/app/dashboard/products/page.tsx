import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ProductsTable } from '@/modules/products/components/products-table';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadListParams } from '@/shared/list/list-params';

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.products.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Gestión de productos</h1>

      <div className='flex items-center justify-end'>
        {ctx.permissions.has(PERMISSIONS.admin.products.create) ? (
          <ListCreateButton href='/dashboard/products/new'>Crear producto</ListCreateButton>
        ) : null}
      </div>

      <Suspense fallback={<ListSkeleton rows={8} />}>
        <ProductsTable params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
