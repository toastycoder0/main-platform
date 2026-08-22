import { sql } from 'drizzle-orm';
import { boolean, index, integer, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { generateId } from '@/shared/db/id';
import { timestamps } from '@/shared/db/time';

export const user = snakeCase.table(
  'user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId('user')),
    firstName: text().notNull(),
    lastName: text().notNull(),
    email: text().unique().notNull(),
    emailVerified: boolean().default(true),
    image: text(),
    sortOrder: integer().notNull().default(0),
    deletedAt: timestamp({ withTimezone: true }),
    role: text(),
    banned: boolean(),
    banReason: text(),
    banExpires: timestamp({ precision: 6, withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('users_listing_idx').on(table.sortOrder, table.id).where(sql`${table.deletedAt} IS NULL`),
  ],
);
