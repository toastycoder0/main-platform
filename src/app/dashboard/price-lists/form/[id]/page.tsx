import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { priceListParamsSchema } from '@/modules/price-lists/application/price-lists.validation';
import { ArchivePriceListSection } from '@/modules/price-lists/components/archive-price-list-section';
import { PriceListForm } from '@/modules/price-lists/components/price-list-form';
import { getPriceList } from '@/modules/price-lists/infrastructure/price-lists.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditPriceListPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPriceListPage({ params }: EditPriceListPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = priceListParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.priceLists.edit)) {
    notFound();
  }

  const priceList = await getPriceList(ctx, parsedParams.data.id);

  if (!priceList) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar lista de precios</h1>
      <PriceListForm priceList={priceList} />
      {ctx.permissions.has(PERMISSIONS.admin.priceLists.delete) ? (
        <ArchivePriceListSection priceListId={priceList.id} priceListName={priceList.name} />
      ) : null}
    </div>
  );
}
