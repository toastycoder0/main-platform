import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  snakeCase,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { generateId } from '../id';
import { ordering } from '../order';
import { timestamps } from '../time';

export const category = snakeCase.table(
  'category',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('cat')),
    // NULL marks a root category.
    parentId: text(),
    slug: text().notNull(),
    name: text().notNull(),
    description: text(),
    // Materialized ancestor path (slash-delimited ids) for fast subtree lookups.
    path: text().notNull(),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true }),
    ...ordering,
    ...timestamps,
  },
  (table) => [
    // A table cannot reference itself from a column, so the FK is declared here.
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'category_parent_id_fkey',
    }).onDelete('cascade'),
    index('category_parent_listing_idx')
      .on(table.parentId, table.sortOrder, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index('category_path_idx').on(table.path),
    // Postgres treats NULLs as distinct, so root slugs are not globally unique.
    uniqueIndex('category_parent_slug_unique_idx').on(table.parentId, table.slug),
  ],
);
