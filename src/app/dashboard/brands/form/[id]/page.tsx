import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { brandParamsSchema } from '@/modules/brands/application/brands.validation';
import { ArchiveBrandSection } from '@/modules/brands/components/archive-brand-section';
import { BrandForm } from '@/modules/brands/components/brand-form';
import { getBrand, getBrandImage } from '@/modules/brands/infrastructure/brands.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditBrandPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBrandPage({ params }: EditBrandPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = brandParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.brands.edit)) {
    notFound();
  }

  const brand = await getBrand(ctx, parsedParams.data.id);

  if (!brand) {
    notFound();
  }

  const image = await getBrandImage(ctx, brand.id);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar marca</h1>
      <BrandForm brand={brand} image={image} />
      {ctx.permissions.has(PERMISSIONS.admin.brands.delete) ? (
        <ArchiveBrandSection brandId={brand.id} brandName={brand.name} />
      ) : null}
    </div>
  );
}
