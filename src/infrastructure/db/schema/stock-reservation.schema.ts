import { sql } from 'drizzle-orm';
import { check, index, numeric, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';

import { generateId } from '../id';
import { order } from './order.schema';
import { productItem } from './product.schema';
import { user } from './user.schema';
import { lot, warehouseCell } from './warehouse.schema';

/**
 * Time-boxed hold over the quantity of a lot in a cell. It is not a warehouse
 * movement: stock stays where it is, but while `expiresAt` is in the future the
 * quantity no longer counts as available anywhere in the platform. Expired rows
 * are inert and will be purged by a cron in a later phase.
 */
export const stockReservation = snakeCase.table(
  'stock_reservation',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('rsv')),
    variantId: text()
      .notNull()
      .references(() => productItem.id, { onDelete: 'cascade' }),
    lotId: text()
      .notNull()
      .references(() => lot.id, { onDelete: 'cascade' }),
    cellId: text()
      .notNull()
      .references(() => warehouseCell.id, { onDelete: 'cascade' }),
    quantity: numeric({ precision: 16, scale: 4 }).notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    // Traceability only: the reservation lives on its own.
    orderId: text().references(() => order.id, { onDelete: 'set null' }),
    createdById: text()
      .notNull()
      .references(() => user.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('stock_reservation_lot_cell_idx').on(table.lotId, table.cellId, table.expiresAt),
    index('stock_reservation_expires_idx').on(table.expiresAt),
    check('stock_reservation_quantity_check', sql`${table.quantity} > 0`),
  ],
);
