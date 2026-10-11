import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ProductUnitForm } from '@/modules/product-units/components/product-unit-form';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewProductUnitPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.productUnits.create)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear unidad de medida</h1>
      <ProductUnitForm />
    </div>
  );
}
