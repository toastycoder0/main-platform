import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { lotParamsSchema } from '@/modules/warehouse/application/warehouse.validation';
import { LotForm } from '@/modules/warehouse/components/lot-form';
import { getLotById } from '@/modules/warehouse/infrastructure/warehouse.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditLotPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLotPage({ params }: EditLotPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = lotParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (
    !ctx.permissions.has(PERMISSIONS.warehouse.access) ||
    !ctx.permissions.has(PERMISSIONS.warehouse.lots.edit)
  ) {
    notFound();
  }

  const lot = await getLotById(ctx, parsedParams.data.id);

  if (!lot) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar lote</h1>
      <LotForm lot={lot} />
    </div>
  );
}
