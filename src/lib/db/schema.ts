import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgEnum, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { generateId } from './id';
import { timestamps } from './time';

export const userStatusEnum = pgEnum('user_status', ['pending_approval', 'active', 'suspended']);

export const user = snakeCase.table(
  'user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId('user')),
    name: text().notNull(),
    firstName: text().notNull(),
    lastName: text().notNull(),
    email: text().unique().notNull(),
    emailVerified: boolean().default(true),
    image: text(),
    status: userStatusEnum().default('pending_approval').notNull(),
    sortOrder: integer().notNull().default(0),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('users_listing_idx').on(table.sortOrder, table.id).where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const session = snakeCase.table(
  'session',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('sess')),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps,
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = snakeCase.table('account', {
  id: text()
    .primaryKey()
    .$defaultFn(() => generateId('acct')),
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  issuer: text().notNull(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  idToken: text(),
  password: text(),
  ...timestamps,
});

export const verification = snakeCase.table(
  'verification',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('verf')),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);
