import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  primaryKey,
  serial,
  snakeCase,
  text,
  unique,
} from 'drizzle-orm/pg-core';

import { generateId } from '../id';
import { ordering } from '../order';
import { timestamps } from '../time';
import { productItem } from './product.schema';
import { user } from './user.schema';

export const movementTypeEnum = pgEnum('movement_type', ['assign', 'move', 'out', 'revert']);

export const movementReasonEnum = pgEnum('movement_reason', [
  'reception',
  'material_out',
  'delivery',
  'transfer',
]);

export const warehouse = snakeCase.table('warehouse', {
  id: text()
    .primaryKey()
    .$defaultFn(() => generateId('wh')),
  name: text().notNull(),
  ...timestamps,
});

export const warehouseNode = snakeCase.table(
  'warehouse_node',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('wn')),
    warehouseId: text()
      .notNull()
      .references(() => warehouse.id),
    parentId: text(),
    name: text().notNull(),
    kind: text().notNull(),
    path: text().notNull(),
    ...ordering,
    isActive: boolean().default(true).notNull(),
    attributes: jsonb().default('{}').notNull(),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'warehouse_node_parent_id_fkey',
    }),
    index('warehouse_node_warehouse_path_idx').on(table.warehouseId, table.path),
    unique('warehouse_node_path_warehouse_unique').on(table.warehouseId, table.path),
  ],
);

export const warehouseCell = snakeCase.table(
  'warehouse_cell',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('wcel')),
    warehouseId: text()
      .notNull()
      .references(() => warehouse.id),
    nodeId: text()
      .notNull()
      .references(() => warehouseNode.id),
    code: text().notNull(),
    position: integer().notNull(),
    capacity: numeric({ precision: 12, scale: 4 }),
    isActive: boolean().default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    unique('warehouse_cell_code_warehouse_unique').on(table.warehouseId, table.code),
    check('warehouse_cell_capacity_check', sql`${table.capacity} IS NULL OR ${table.capacity} > 0`),
  ],
);

export const lot = snakeCase.table(
  'lot',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('lot')),
    itemId: text()
      .notNull()
      .references(() => productItem.id),
    code: text().notNull(),
    normalizedCode: text().notNull(),
    isActive: boolean().default(true).notNull(),
    ...timestamps,
  },
  (table) => [unique('lot_item_code_unique').on(table.itemId, table.normalizedCode)],
);

export const cellLot = snakeCase.table(
  'cell_lot',
  {
    cellId: text()
      .notNull()
      .references(() => warehouseCell.id),
    lotId: text()
      .notNull()
      .references(() => lot.id),
    quantity: numeric({ precision: 16, scale: 4 }).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.cellId, table.lotId] }),
    check('cell_lot_quantity_check', sql`${table.quantity} >= 0`),
    index('cell_lot_lot_idx').on(table.lotId),
  ],
);

export const movement = snakeCase.table(
  'movement',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('mov')),
    sequentialNumber: serial('sequential_number').notNull().unique(),
    type: movementTypeEnum().notNull(),
    reason: movementReasonEnum(),
    userId: text()
      .notNull()
      .references(() => user.id),
    note: text(),
    reference: text(),
    revertsId: text(),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.revertsId],
      foreignColumns: [table.id],
      name: 'movement_reverts_id_fkey',
    }),
    unique('movement_reverts_id_unique').on(table.revertsId),
    check(
      'movement_type_reason_check',
      sql`(${table.type} = 'assign' AND ${table.reason} = 'reception')
        OR (${table.type} = 'out' AND ${table.reason} IN ('material_out', 'delivery'))
        OR (${table.type} = 'move' AND ${table.reason} = 'transfer')
        OR (${table.type} = 'revert' AND ${table.reason} IS NULL)`,
    ),
  ],
);

export const movementEntry = snakeCase.table(
  'movement_entry',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('mve')),
    movementId: text()
      .notNull()
      .references(() => movement.id),
    lotId: text()
      .notNull()
      .references(() => lot.id),
    originCellId: text().references(() => warehouseCell.id),
    destinationCellId: text().references(() => warehouseCell.id),
    quantity: numeric({ precision: 16, scale: 4 }).notNull(),
  },
  (table) => [
    index('movement_entry_movement_idx').on(table.movementId),
    check('movement_entry_quantity_check', sql`${table.quantity} > 0`),
    check(
      'movement_entry_not_same_cell',
      sql`${table.originCellId} IS DISTINCT FROM ${table.destinationCellId}`,
    ),
    check(
      'movement_entry_has_endpoint',
      sql`${table.originCellId} IS NOT NULL OR ${table.destinationCellId} IS NOT NULL`,
    ),
  ],
);
