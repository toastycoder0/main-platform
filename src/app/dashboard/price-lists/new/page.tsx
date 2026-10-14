import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { PriceListForm } from '@/modules/price-lists/components/price-list-form';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewPriceListPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.priceLists.create)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear lista de precios</h1>
      <PriceListForm />
    </div>
  );
}
