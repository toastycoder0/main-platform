import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { MovementFormKind } from '../application/warehouse.movement';
import { getMovementFormOptions } from '../infrastructure/warehouse.query';
import { WarehouseMovementDialog } from './warehouse-movement-dialog';

interface WarehouseMovementDialogLoaderProps {
  initialKind: MovementFormKind;
  initialLotId: string | null;
  initialCellId: string | null;
}

export async function WarehouseMovementDialogLoader({
  initialKind,
  initialLotId,
  initialCellId,
}: WarehouseMovementDialogLoaderProps) {
  const ctx = await createRequestContext();
  const options = await getMovementFormOptions(ctx);

  return (
    <WarehouseMovementDialog
      initialCellId={initialCellId}
      initialKind={initialKind}
      initialLotId={initialLotId}
      key={`${initialKind}:${initialLotId ?? ''}:${initialCellId ?? ''}`}
      options={options}
    />
  );
}
