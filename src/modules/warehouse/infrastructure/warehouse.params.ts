import { createLoader, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { listParams } from '@/shared/list/list-params';
import { WAREHOUSE_VIEWS } from '../application/warehouse.view';

export const warehouseParams = {
  ...listParams,
  view: parseAsStringLiteral(WAREHOUSE_VIEWS).withDefault('lots'),
  highlight: parseAsString,
};

export const loadWarehouseParams = createLoader(warehouseParams);

export type WarehouseParams = Awaited<ReturnType<typeof loadWarehouseParams>>;
