import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { CurrencyForm } from '@/modules/currencies/components/currency-form';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewCurrencyPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.currencies.create)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear moneda</h1>
      <CurrencyForm />
    </div>
  );
}
