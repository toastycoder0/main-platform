import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { BrandForm } from '@/modules/brands/components/brand-form';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewBrandPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.brands.create)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear marca</h1>
      <BrandForm />
    </div>
  );
}
