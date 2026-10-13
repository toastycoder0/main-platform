import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ProductForm } from '@/modules/products/components/product-form';
import {
  listBrandOptions,
  listCurrencyOptions,
  listProductUnitOptions,
} from '@/modules/products/infrastructure/products.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewProductPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.products.create)) {
    notFound();
  }

  const [brandOptions, productUnitOptions, currencyOptions] = await Promise.all([
    listBrandOptions(ctx),
    listProductUnitOptions(ctx),
    listCurrencyOptions(ctx),
  ]);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear producto</h1>
      <ProductForm
        brandOptions={brandOptions}
        productUnitOptions={productUnitOptions}
        currencyOptions={currencyOptions}
      />
    </div>
  );
}
