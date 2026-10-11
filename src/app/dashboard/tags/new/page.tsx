import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { TagForm } from '@/modules/tags/components/tag-form';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewTagPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.tags.create)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear etiqueta</h1>
      <TagForm />
    </div>
  );
}
