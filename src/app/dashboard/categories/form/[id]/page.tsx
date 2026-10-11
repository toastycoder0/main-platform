import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { CategoryForm } from '@/modules/categories/components/category-form';
import { findCategoryById } from '@/modules/categories/infrastructure/categories.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);

  if (!ctx.permissions.has(PERMISSIONS.admin.categories.edit)) {
    notFound();
  }

  const category = await findCategoryById(ctx, rawParams.id);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar categoría</h1>
      <CategoryForm
        mode='edit'
        id={category.id}
        name={category.name}
        description={category.description}
        isActive={category.isActive}
      />
    </div>
  );
}
