import { createLoader, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { listParams } from '@/shared/list/list-params';
import { MOVEMENT_FORM_KINDS } from '../application/warehouse.movement';
import { WAREHOUSE_VIEWS } from '../application/warehouse.view';

export const movementParams = {
  movement: parseAsStringLiteral(MOVEMENT_FORM_KINDS),
  lot: parseAsString,
  cell: parseAsString,
};

export const warehouseParams = {
  ...listParams,
  view: parseAsStringLiteral(WAREHOUSE_VIEWS).withDefault('lots'),
  highlight: parseAsString,
  ...movementParams,
};

export const loadWarehouseParams = createLoader(warehouseParams);

export type WarehouseParams = Awaited<ReturnType<typeof loadWarehouseParams>>;
