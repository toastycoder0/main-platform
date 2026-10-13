import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { listCategoryOptions } from '@/modules/categories/infrastructure/categories.query';
import { ProductForm } from '@/modules/products/components/product-form';
import {
  listBrandOptions,
  listCurrencyOptions,
  listDocumentTypeOptions,
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
  ] = await Promise.all([
    listBrandOptions(ctx),
    listProductUnitOptions(ctx),
    listCurrencyOptions(ctx),
    listTagOptions(ctx),
    listCategoryOptions(ctx),
    listDocumentTypeOptions(ctx),
  ]);

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
      />
    </div>
  );
}
