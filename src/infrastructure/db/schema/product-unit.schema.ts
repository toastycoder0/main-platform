import { sql } from 'drizzle-orm';
import { boolean, index, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { generateId } from '../id';
import { ordering } from '../order';
import { timestamps } from '../time';

export const productUnit = snakeCase.table(
  'product_unit',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('unit')),
    slug: text().notNull().unique(),
    name: text().notNull(),
    abbreviation: text(),
    taxCode: text(),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true }),
    ...ordering,
    ...timestamps,
  },
  (table) => [
    index('product_unit_listing_idx')
      .on(table.sortOrder, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);
