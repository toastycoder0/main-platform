import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgEnum, snakeCase, text } from 'drizzle-orm/pg-core';

import { generateId } from '../id';
import type { JsonValue } from '../json';
import { ordering } from '../order';
import { timestamps } from '../time';
import { product, productItem } from './product.schema';
import { user } from './user.schema';

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'completed',
  'cancelled',
]);

export const orderFulfillmentTypeEnum = pgEnum('order_fulfillment_type', [
  'home',
  'warehouse',
  'shipping-company',
]);

export const order = snakeCase.table(
  'order',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('ord')),
    code: text().notNull().unique('order_code_unique'),
    userId: text()
      .notNull()
      .references(() => user.id),
    createdById: text()
      .notNull()
      .references(() => user.id),
    status: orderStatusEnum().default('pending').notNull(),
    fulfillmentType: orderFulfillmentTypeEnum().notNull(),
    // Snapshots taken at checkout; readers parse them with the checkout schemas.
    billing: jsonb().$type<JsonValue>().notNull(),
    fulfillment: jsonb().$type<JsonValue>().notNull(),
    subtotals: jsonb().$type<JsonValue>().notNull(),
    taxes: jsonb().$type<JsonValue>().notNull(),
    totals: jsonb().$type<JsonValue>().notNull(),
    notes: text().default('').notNull(),
    ...timestamps,
  },
  (table) => [
    index('order_user_idx').on(table.userId, table.createdAt),
    index('order_status_idx').on(table.status),
    check('order_code_format', sql`${table.code} ~ '^PED-[0-9]{8}-[0-9A-HJKMNP-TV-Z]{8}$'`),
  ],
);

export const orderItem = snakeCase.table(
  'order_item',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('oitem')),
    orderId: text()
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    // Catalog links are kept for traceability only; the snapshot columns are the source of truth.
    productId: text().references(() => product.id, { onDelete: 'set null' }),
    variantId: text().references(() => productItem.id, { onDelete: 'set null' }),
    productSlug: text().notNull(),
    productTitle: text().notNull(),
    variantTitle: text().notNull(),
    unit: text(),
    currency: text().notNull(),
    quantity: integer().notNull(),
    fields: jsonb().$type<JsonValue>().notNull(),
    price: jsonb().$type<JsonValue>().notNull(),
    tax: jsonb().$type<JsonValue>(),
    ...ordering,
    ...timestamps,
  },
  (table) => [
    index('order_item_order_idx').on(table.orderId, table.sortOrder),
    check('order_item_quantity_check', sql`${table.quantity} > 0`),
  ],
);
