import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { CategoryForm } from '@/modules/categories/components/category-form';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface NewCategoryPageProps {
  searchParams: Promise<{ parentId?: string }>;
}

export default async function NewCategoryPage({ searchParams }: NewCategoryPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.categories.create)) {
    notFound();
  }

  const rawParams = await searchParams;
  const parentId = typeof rawParams.parentId === 'string' ? rawParams.parentId : null;

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Nueva categoría</h1>
      {parentId && (
        <p className='text-sm text-muted-foreground'>
          Se creará como subcategoría de la categoría seleccionada.
        </p>
      )}
      <CategoryForm mode='create' parentId={parentId} />
    </div>
  );
}
