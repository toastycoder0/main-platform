import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { LotCreateShell } from '@/modules/warehouse/components/lot-create-shell';
import {
  listLotItemOptions,
  listLotSiblings,
} from '@/modules/warehouse/infrastructure/warehouse.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewLotPage() {
  const ctx = await createRequestContext();

  if (
    !ctx.permissions.has(PERMISSIONS.warehouse.access) ||
    !ctx.permissions.has(PERMISSIONS.warehouse.lots.create)
  ) {
    notFound();
  }

  const [itemOptions, lots] = await Promise.all([listLotItemOptions(ctx), listLotSiblings(ctx)]);

  return <LotCreateShell itemOptions={itemOptions} lots={lots} />;
}
