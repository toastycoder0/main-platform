import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { buildPriceEntries } from '@/modules/products/application/products.prices';
import { ProductForm } from '@/modules/products/components/product-form';
import { getProductFormOptions } from '@/modules/products/infrastructure/products.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewProductPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.products.create)) {
    notFound();
  }

  const options = await getProductFormOptions(ctx);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear producto</h1>
      <ProductForm
        {...options}
        defaultPrices={buildPriceEntries(options.priceListOptions)}
        defaultUnitId={options.productUnitOptions[0]?.value ?? ''}
        defaultCurrency={options.currencyOptions[0]?.value ?? 'MXN'}
        defaultDocumentTypeId={options.documentTypeOptions[0]?.value ?? ''}
      />
    </div>
  );
}
