import { sql } from 'drizzle-orm';
import { boolean, index, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { generateId } from '../id';
import { ordering } from '../order';
import { timestamps } from '../time';

export const brand = snakeCase.table(
  'brand',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('brd')),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text(),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true }),
    ...ordering,
    ...timestamps,
  },
  (table) => [
    index('brand_listing_idx').on(table.sortOrder, table.id).where(sql`${table.deletedAt} IS NULL`),
  ],
);
