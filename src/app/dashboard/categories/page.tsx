import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { CategoriesTreeView } from '@/modules/categories/components/categories-tree-view';
import { getCategoryTree } from '@/modules/categories/infrastructure/categories.query';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { PERMISSIONS } from '@/shared/constants/permissions';

async function CategoriesTree() {
  const ctx = await createRequestContext();
  const rows = await getCategoryTree(ctx);
  return <CategoriesTreeView rows={rows} />;
}

export default async function CategoriesPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.categories.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Gestión de categorías</h1>

      <div className='flex items-center justify-end'>
        {ctx.permissions.has(PERMISSIONS.admin.categories.create) ? (
          <ListCreateButton href='/dashboard/categories/new'>Crear categoría</ListCreateButton>
        ) : null}
      </div>

      <Suspense fallback={<ListSkeleton rows={8} />}>
        <CategoriesTree />
      </Suspense>
    </div>
  );
}
