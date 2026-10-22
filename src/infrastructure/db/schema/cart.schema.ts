import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, snakeCase, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { generateId } from '../id';
import type { JsonValue } from '../json';
import { timestamps } from '../time';
import { product, productItem } from './product.schema';
import { user } from './user.schema';

/** Values captured by the open fields of the chosen variant. */
export type CartItemFields = Record<string, string>;

export const cart = snakeCase.table(
  'cart',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('cart')),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Checkout draft, one column per step; null means the step is incomplete.
    billing: jsonb().$type<JsonValue>(),
    delivery: jsonb().$type<JsonValue>(),
    ...timestamps,
  },
  // A single cart per user; checkout clears it. Cart history (status + partial
  // unique index on active carts) can be added once orders exist.
  (table) => [uniqueIndex('cart_user_idx').on(table.userId)],
);

export const cartItem = snakeCase.table(
  'cart_item',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('citem')),
    cartId: text()
      .notNull()
      .references(() => cart.id, { onDelete: 'cascade' }),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    variantId: text()
      .notNull()
      .references(() => productItem.id, { onDelete: 'cascade' }),
    quantity: integer().notNull(),
    fields: jsonb().$type<CartItemFields>().default({}).notNull(),
    /**
     * sha256 of the canonical configuration (trimmed and sorted fields), so the
     * same variant with the same options is a single line and concurrent tabs
     * cannot duplicate it.
     */
    configHash: text().notNull(),
    ...timestamps,
  },
  (table) => [
    index('cart_item_cart_idx').on(table.cartId),
    uniqueIndex('cart_item_line_idx').on(table.cartId, table.variantId, table.configHash),
    check('cart_item_quantity_check', sql`${table.quantity} > 0`),
  ],
);
