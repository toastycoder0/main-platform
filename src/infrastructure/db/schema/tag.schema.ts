import { sql } from 'drizzle-orm';
import { boolean, index, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { generateId } from '../id';
import { ordering } from '../order';
import { timestamps } from '../time';

export const tag = snakeCase.table(
  'tag',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('tag')),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text(),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true }),
    ...ordering,
    ...timestamps,
  },
  (table) => [
    index('tag_listing_idx').on(table.sortOrder, table.id).where(sql`${table.deletedAt} IS NULL`),
  ],
);
