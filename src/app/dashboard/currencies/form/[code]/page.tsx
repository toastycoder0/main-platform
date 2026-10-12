import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { currencyParamsSchema } from '@/modules/currencies/application/currencies.validation';
import { ArchiveCurrencySection } from '@/modules/currencies/components/archive-currency-section';
import { CurrencyForm } from '@/modules/currencies/components/currency-form';
import { getCurrency } from '@/modules/currencies/infrastructure/currencies.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditCurrencyPageProps {
  params: Promise<{ code: string }>;
}

export default async function EditCurrencyPage({ params }: EditCurrencyPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = currencyParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.currencies.edit)) {
    notFound();
  }

  const currency = await getCurrency(ctx, parsedParams.data.code);

  if (!currency) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar moneda</h1>
      <CurrencyForm currency={currency} />
      {ctx.permissions.has(PERMISSIONS.admin.currencies.delete) ? (
        <ArchiveCurrencySection currencyCode={currency.code} currencyName={currency.name} />
      ) : null}
    </div>
  );
}
