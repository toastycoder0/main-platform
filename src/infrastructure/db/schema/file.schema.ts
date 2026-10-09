import { sql } from 'drizzle-orm';
import { index, snakeCase, text } from 'drizzle-orm/pg-core';
import { generateId } from '../id';
import { ordering } from '../order';
import { timestamps } from '../time';

// Central file registry. A row represents one stored file; ownership is the
// (entity, scope, ownerId) locator. `ownerId` null means the file is not
// claimed by anyone and becomes eligible for garbage collection.
export const file = snakeCase.table(
  'file',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('file')),
    key: text(),
    tempKey: text().unique(),
    createdBy: text(),
    entity: text().notNull(),
    scope: text().notNull(),
    ownerId: text(),
    ...ordering,
    ...timestamps,
  },
  (table) => [
    index('file_locator_idx').on(
      table.entity,
      table.scope,
      table.ownerId,
      table.sortOrder,
      table.id,
    ),
    index('file_orphan_idx').on(table.updatedAt).where(sql`${table.ownerId} IS NULL`),
  ],
);
