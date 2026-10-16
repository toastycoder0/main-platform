import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function WarehousePage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.warehouse.access)) {
    notFound();
  }

  return (
    <div>
      <h1 className='text-2xl font-semibold'>Almac&eacute;n</h1>
      <p className='mt-2 text-neutral-500'>
        Bienvenido. Esta secci&oacute;n est&aacute; en construcci&oacute;n.
      </p>
    </div>
  );
}
