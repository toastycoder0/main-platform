import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { productUnitParamsSchema } from '@/modules/product-units/application/product-units.validation';
import { ArchiveProductUnitSection } from '@/modules/product-units/components/archive-product-unit-section';
import { ProductUnitForm } from '@/modules/product-units/components/product-unit-form';
import { getProductUnit } from '@/modules/product-units/infrastructure/product-units.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditProductUnitPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductUnitPage({ params }: EditProductUnitPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = productUnitParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.productUnits.edit)) {
    notFound();
  }

  const productUnit = await getProductUnit(ctx, parsedParams.data.id);

  if (!productUnit) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar unidad de medida</h1>
      <ProductUnitForm productUnit={productUnit} />
      {ctx.permissions.has(PERMISSIONS.admin.productUnits.delete) ? (
        <ArchiveProductUnitSection
          productUnitId={productUnit.id}
          productUnitName={productUnit.name}
        />
      ) : null}
    </div>
  );
}
