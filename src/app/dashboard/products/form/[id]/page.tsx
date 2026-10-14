import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { buildPriceEntries } from '@/modules/products/application/products.prices';
import { productParamsSchema } from '@/modules/products/application/products.validation';
import { ProductForm } from '@/modules/products/components/product-form';
import {
  findProductForm,
  getProductFormOptions,
} from '@/modules/products/infrastructure/products.query';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { isAppError } from '@/shared/errors';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = productParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.products.edit)) {
    notFound();
  }

  const product = await findProductForm(ctx, parsedParams.data.id).catch((error) => {
    if (isAppError(error) && error.code === 'not_found') {
      notFound();
    }
    throw error;
  });
  const options = await getProductFormOptions(ctx, product);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar producto</h1>
      <ProductForm
        {...options}
        product={product}
        defaultPrices={buildPriceEntries(options.priceListOptions)}
        defaultUnitId={product.unitId}
        defaultCurrency={product.baseCurrency}
        defaultDocumentTypeId={options.documentTypeOptions[0]?.value ?? ''}
      />
    </div>
  );
}
