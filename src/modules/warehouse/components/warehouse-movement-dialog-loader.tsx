import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { MovementFormKind } from '../application/warehouse.movement';
import type { WarehouseView } from '../application/warehouse.view';
import { getMovementFormOptions } from '../infrastructure/warehouse.query';
import { WarehouseMovementDialog } from './warehouse-movement-dialog';

interface WarehouseMovementDialogLoaderProps {
  allowedKinds: readonly MovementFormKind[];
  initialKind: MovementFormKind;
  initialView: WarehouseView;
  initialLotId: string | null;
  initialCellId: string | null;
}

export async function WarehouseMovementDialogLoader({
  allowedKinds,
  initialKind,
  initialView,
  initialLotId,
  initialCellId,
}: WarehouseMovementDialogLoaderProps) {
  const ctx = await createRequestContext();
  const options = await getMovementFormOptions(ctx);

  return (
    <WarehouseMovementDialog
      allowedKinds={allowedKinds}
      initialCellId={initialCellId}
      initialKind={initialKind}
      initialLotId={initialLotId}
      initialView={initialView}
      key={`${initialKind}:${initialLotId ?? ''}:${initialCellId ?? ''}`}
      options={options}
    />
  );
}
