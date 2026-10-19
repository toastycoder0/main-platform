import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { movementParamsSchema } from '@/modules/warehouse/application/warehouse.validation';
import { WarehouseMovementDetail } from '@/modules/warehouse/components/warehouse-movement-detail';
import { getMovement } from '@/modules/warehouse/infrastructure/warehouse.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export const metadata: Metadata = {
  title: 'Detalle de movimiento',
};

interface MovementDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MovementDetailPage({ params }: MovementDetailPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = movementParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.warehouse.access)) {
    notFound();
  }

  const movement = await getMovement(ctx, parsedParams.data.id);

  if (!movement) {
    notFound();
  }

  // The engine rejects a revert of a revert or of an already reverted
  // movement, so hiding the button mirrors those server rules.
  const canRevert =
    ctx.permissions.has(PERMISSIONS.warehouse.stock.revert) &&
    !movement.revertedById &&
    movement.type !== 'revert';

  return <WarehouseMovementDetail canRevert={canRevert} movement={movement} />;
}
