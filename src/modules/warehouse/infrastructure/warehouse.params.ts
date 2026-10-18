import { createLoader, createParser, parseAsArrayOf, parseAsStringLiteral } from 'nuqs/server';
import { z } from 'zod';
import { listParams } from '@/shared/list/list-params';
import { MOVEMENT_FORM_KINDS } from '../application/warehouse.movement';
import { MOVEMENT_FILTER_VALUES } from '../application/warehouse.validation';
import { WAREHOUSE_VIEWS } from '../application/warehouse.view';

// Bounded id-like values coming from the URL (lot, cell, highlight). Anything
// else (empty, oversized) is dropped to null so it never reaches a query.
const URL_ID_MAX_LENGTH = 100;

const parseAsId = createParser({
  parse: (value) =>
    z.string().min(1).max(URL_ID_MAX_LENGTH).safeParse(value).success ? value : null,
  serialize: (value) => value,
});

export const movementParams = {
  movement: parseAsStringLiteral(MOVEMENT_FORM_KINDS),
  lot: parseAsId,
  cell: parseAsId,
};

export const warehouseParams = {
  ...listParams,
  view: parseAsStringLiteral(WAREHOUSE_VIEWS).withDefault('lots'),
  highlight: parseAsId,
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
  lot: parseAsId,
  cell: parseAsId,
};

export const loadMovementHistoryParams = createLoader(movementHistoryParams);

export type MovementHistoryParams = Awaited<ReturnType<typeof loadMovementHistoryParams>>;
