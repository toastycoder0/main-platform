import { index, jsonb, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';

import { generateId } from '../id';
import type { JsonValue } from '../json';
import { order, orderStatusEnum } from './order.schema';
import { user } from './user.schema';

/**
 * Append-only log of everything that happens to an order. `action` is free
 * text validated in the domain so new actions do not need a migration; the
 * status columns stay enums because they mirror `order.status`.
 */
export const orderEvent = snakeCase.table(
  'order_event',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('oevt')),
    orderId: text()
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    action: text().notNull(),
    fromStatus: orderStatusEnum(),
    toStatus: orderStatusEnum(),
    actorId: text()
      .notNull()
      .references(() => user.id),
    reason: text(),
    metadata: jsonb().$type<JsonValue>(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('order_event_order_idx').on(table.orderId, table.createdAt)],
);
