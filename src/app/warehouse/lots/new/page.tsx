import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { LotForm } from '@/modules/warehouse/components/lot-form';
import { listLotItemOptions } from '@/modules/warehouse/infrastructure/warehouse.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewLotPage() {
  const ctx = await createRequestContext();

  if (
    !ctx.permissions.has(PERMISSIONS.warehouse.access) ||
    !ctx.permissions.has(PERMISSIONS.warehouse.lots.create)
  ) {
    notFound();
  }

  const itemOptions = await listLotItemOptions(ctx);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear lote</h1>
      <LotForm itemOptions={itemOptions} />
    </div>
  );
}
