import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { currency } from '@/infrastructure/db/schema';
import { ExchangeRateForm } from '@/modules/exchange-rates/components/exchange-rate-form';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewExchangeRatePage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.exchangeRates.create)) {
    notFound();
  }

  const currencies = await ctx.db
    .select({ code: currency.code, name: currency.name })
    .from(currency);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear tipo de cambio</h1>
      <ExchangeRateForm currencies={currencies} />
    </div>
  );
}
