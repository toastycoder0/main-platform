import {
  createLoader,
  createParser,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server';
import { z } from 'zod';
import { listParams } from '@/shared/list/list-params';
import { MOVEMENT_FORM_KINDS } from '../application/warehouse.movement';
import { MOVEMENT_FILTER_VALUES } from '../application/warehouse.validation';
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

const parseAsIsoDate = createParser({
  parse: (value) => (z.iso.date().safeParse(value).success ? value : null),
  serialize: (value) => value,
});

export const movementHistoryParams = {
  ...listParams,
  movements: parseAsArrayOf(parseAsStringLiteral(MOVEMENT_FILTER_VALUES)).withDefault([]),
  from: parseAsIsoDate,
  to: parseAsIsoDate,
  lot: parseAsString,
  cell: parseAsString,
};

export const loadMovementHistoryParams = createLoader(movementHistoryParams);

export type MovementHistoryParams = Awaited<ReturnType<typeof loadMovementHistoryParams>>;
