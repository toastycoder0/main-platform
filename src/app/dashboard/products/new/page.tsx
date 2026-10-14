import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { listCategoryOptions } from '@/modules/categories/infrastructure/categories.query';
import type { ProductPriceEntry } from '@/modules/products/components/product-form';
import { ProductForm } from '@/modules/products/components/product-form';
import {
  listBrandOptions,
  listCurrencyOptions,
  listDocumentTypeOptions,
  listPriceListOptions,
  listProductOptions,
  listProductUnitOptions,
} from '@/modules/products/infrastructure/products.query';
import { listTagOptions } from '@/modules/tags/infrastructure/tags.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewProductPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.products.create)) {
    notFound();
  }

  const [
    brandOptions,
    productUnitOptions,
    currencyOptions,
    tagOptions,
    categoryOptions,
    documentTypeOptions,
    priceListOptions,
    productOptions,
  ] = await Promise.all([
    listBrandOptions(ctx),
    listProductUnitOptions(ctx),
    listCurrencyOptions(ctx),
    listTagOptions(ctx),
    listCategoryOptions(ctx),
    listDocumentTypeOptions(ctx),
    listPriceListOptions(ctx),
    listProductOptions(ctx),
  ]);

  const defaultPrices: ProductPriceEntry[] = priceListOptions.map((option) => ({
    priceListId: option.value,
    amount: '',
  }));

  const defaultUnitId = productUnitOptions[0]?.value ?? '';
  const defaultCurrency = currencyOptions[0]?.value ?? 'MXN';
  const defaultDocumentTypeId = documentTypeOptions[0]?.value ?? '';

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear producto</h1>
      <ProductForm
        brandOptions={brandOptions}
        productUnitOptions={productUnitOptions}
        currencyOptions={currencyOptions}
        tagOptions={tagOptions}
        categoryOptions={categoryOptions}
        documentTypeOptions={documentTypeOptions}
        priceListOptions={priceListOptions}
        productOptions={productOptions}
        defaultPrices={defaultPrices}
        defaultUnitId={defaultUnitId}
        defaultCurrency={defaultCurrency}
        defaultDocumentTypeId={defaultDocumentTypeId}
      />
    </div>
  );
}
