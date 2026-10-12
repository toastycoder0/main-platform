import { boolean, index, integer, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { ordering } from '../order';
import { timestamps } from '../time';

export const currency = snakeCase.table(
  'currency',
  {
    code: text().primaryKey(),
    name: text().notNull(),
    decimalDigits: integer().default(2).notNull(),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true }),
    ...ordering,
    ...timestamps,
  },
  (table) => [index('currency_listing_idx').on(table.sortOrder, table.code)],
);
