import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { currency } from '@/infrastructure/db/schema';
import { exchangeRateParamsSchema } from '@/modules/exchange-rates/application/exchange-rates.validation';
import { ArchiveExchangeRateSection } from '@/modules/exchange-rates/components/archive-exchange-rate-section';
import { ExchangeRateForm } from '@/modules/exchange-rates/components/exchange-rate-form';
import { getExchangeRate } from '@/modules/exchange-rates/infrastructure/exchange-rates.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditExchangeRatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExchangeRatePage({ params }: EditExchangeRatePageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = exchangeRateParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.exchangeRates.edit)) {
    notFound();
  }

  const exchangeRate = await getExchangeRate(ctx, parsedParams.data.id);

  if (!exchangeRate) {
    notFound();
  }

  const currencies = await ctx.db
    .select({ code: currency.code, name: currency.name })
    .from(currency);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar tipo de cambio</h1>
      <ExchangeRateForm exchangeRate={exchangeRate} currencies={currencies} />
      {ctx.permissions.has(PERMISSIONS.admin.exchangeRates.delete) ? (
        <ArchiveExchangeRateSection
          exchangeRateId={exchangeRate.id}
          pair={`${exchangeRate.baseCode}/${exchangeRate.quoteCode}`}
        />
      ) : null}
    </div>
  );
}
